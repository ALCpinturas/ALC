import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import ConfirmarDialog from '@/components/ui/ConfirmarDialog'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { EstadoVazio } from '@/components/ui/Estados'
import { resumoDivisao, type Divisao } from '@/lib/calculo/medicoes'
import { formatarNumero } from '@/lib/format'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { MedicaoComVaos } from '@/lib/hooks/useOrcamento'
import type { TipoVao } from '@/types/database'

const TIPOS_VAO = [
  { valor: 'porta', rotulo: 'Porta' },
  { valor: 'janela', rotulo: 'Janela' },
  { valor: 'abertura', rotulo: 'Abertura' },
]

interface EditorMedicoesProps {
  orcamentoId: string
  medicoes: MedicaoComVaos[]
  bloqueado: boolean
  aoMudar: () => void
}

function paraDivisao(medicao: MedicaoComVaos): Divisao {
  return {
    comprimento_cm: medicao.comprimento_cm,
    largura_cm: medicao.largura_cm,
    pe_direito_cm: medicao.pe_direito_cm,
    vaos: medicao.vaos.map((vao) => ({
      tipo: vao.tipo,
      largura_cm: vao.largura_cm,
      altura_cm: vao.altura_cm,
      quantidade: vao.quantidade,
    })),
  }
}

export default function EditorMedicoes({
  orcamentoId,
  medicoes,
  bloqueado,
  aoMudar,
}: EditorMedicoesProps) {
  const [aberto, setAberto] = useState(false)
  const [divisao, setDivisao] = useState('')
  const [comprimento, setComprimento] = useState('')
  const [largura, setLargura] = useState('')
  const [peDireito, setPeDireito] = useState('250')
  const [aGravar, setAGravar] = useState(false)

  const [vaoAberto, setVaoAberto] = useState<string | null>(null)
  const [tipoVao, setTipoVao] = useState<string>('porta')
  const [larguraVao, setLarguraVao] = useState('80')
  const [alturaVao, setAlturaVao] = useState('200')
  const [quantidadeVao, setQuantidadeVao] = useState('1')
  const [apagarDivisaoId, setApagarDivisaoId] = useState<string | null>(null)
  const [aApagarDivisao, setAApagarDivisao] = useState(false)

  async function adicionarDivisao() {
    const valores = {
      divisao: divisao.trim(),
      comprimento_cm: Number(comprimento),
      largura_cm: Number(largura),
      pe_direito_cm: Number(peDireito),
    }
    if (!valores.divisao || !valores.comprimento_cm || !valores.largura_cm || !valores.pe_direito_cm) {
      toast.error('Preencha o nome da divisão e as três medidas, em centímetros.')
      return
    }

    setAGravar(true)
    const { error } = await supabase.from('medicoes').insert({
      orcamento_id: orcamentoId,
      ...valores,
      ordem: medicoes.length,
      notas: null,
    })
    setAGravar(false)
    if (error) {
      toast.error(`Não foi possível guardar a divisão. ${mensagemErro(error)}`)
      return
    }
    setAberto(false)
    setDivisao('')
    setComprimento('')
    setLargura('')
    aoMudar()
  }

  async function adicionarVao() {
    if (!vaoAberto) return
    const valores = {
      medicao_id: vaoAberto,
      tipo: tipoVao as TipoVao,
      largura_cm: Number(larguraVao),
      altura_cm: Number(alturaVao),
      quantidade: Number(quantidadeVao),
    }
    if (!valores.largura_cm || !valores.altura_cm || !valores.quantidade) {
      toast.error('Preencha as medidas do vão.')
      return
    }
    const { error } = await supabase.from('medicoes_vaos').insert(valores)
    if (error) {
      toast.error(`Não foi possível guardar o vão. ${mensagemErro(error)}`)
      return
    }
    setVaoAberto(null)
    aoMudar()
  }

  async function apagarDivisao() {
    if (!apagarDivisaoId) return
    setAApagarDivisao(true)
    const { error } = await supabase.from('medicoes').delete().eq('id', apagarDivisaoId)
    setAApagarDivisao(false)
    if (error) {
      toast.error(`Não foi possível apagar. ${mensagemErro(error)}`)
      return
    }
    setApagarDivisaoId(null)
    aoMudar()
  }

  async function apagarVao(id: string) {
    const { error } = await supabase.from('medicoes_vaos').delete().eq('id', id)
    if (error) {
      toast.error(`Não foi possível apagar o vão. ${mensagemErro(error)}`)
      return
    }
    aoMudar()
  }

  return (
    <div className="space-y-4">
      {!bloqueado ? (
        <Button onClick={() => setAberto(true)}>
          <Plus aria-hidden className="size-4" />
          Adicionar divisão
        </Button>
      ) : null}

      {medicoes.length === 0 ? (
        <EstadoVazio
          titulo="Ainda não há medições."
          descricao="Meça as divisões no local e registe aqui: as quantidades do orçamento saem daqui."
        />
      ) : (
        <ul className="space-y-3">
          {medicoes.map((medicao) => {
            const resumo = resumoDivisao(paraDivisao(medicao))
            return (
              <li key={medicao.id} className="border border-alc-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-alc-black">{medicao.divisao}</h3>
                    <p className="text-sm text-alc-ink">
                      {formatarNumero(medicao.comprimento_cm / 100)} ×{' '}
                      {formatarNumero(medicao.largura_cm / 100)} m, pé direito{' '}
                      {formatarNumero(medicao.pe_direito_cm / 100)} m
                    </p>
                  </div>
                  {!bloqueado ? (
                    <button
                      type="button"
                      aria-label={`Apagar ${medicao.divisao}`}
                      onClick={() => setApagarDivisaoId(medicao.id)}
                      className="toque flex items-center justify-center text-alc-rose-deep"
                    >
                      <Trash2 aria-hidden className="size-5" />
                    </button>
                  ) : null}
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-alc-line pt-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-alc-ink">Pavimento</dt>
                    <dd>{formatarNumero(resumo.pavimento)} m²</dd>
                  </div>
                  <div>
                    <dt className="text-alc-ink">Teto</dt>
                    <dd>{formatarNumero(resumo.teto)} m²</dd>
                  </div>
                  <div>
                    <dt className="text-alc-ink">Paredes</dt>
                    <dd>{formatarNumero(resumo.paredes)} m²</dd>
                  </div>
                  <div>
                    <dt className="text-alc-ink">Rodapé</dt>
                    <dd>{formatarNumero(resumo.rodape)} ml</dd>
                  </div>
                </dl>

                {medicao.vaos.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-alc-line pt-3 text-sm">
                    {medicao.vaos.map((vao) => (
                      <li key={vao.id} className="flex items-center justify-between gap-2">
                        <span>
                          {vao.quantidade} × {vao.tipo} {formatarNumero(vao.largura_cm / 100)} ×{' '}
                          {formatarNumero(vao.altura_cm / 100)} m
                        </span>
                        {!bloqueado ? (
                          <button
                            type="button"
                            aria-label="Apagar vão"
                            onClick={() => void apagarVao(vao.id)}
                            className="text-alc-rose-deep"
                          >
                            Remover
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {!bloqueado ? (
                  <Button
                    variante="fantasma"
                    tamanho="sm"
                    className="mt-3"
                    onClick={() => setVaoAberto(medicao.id)}
                  >
                    <Plus aria-hidden className="size-4" />
                    Vão
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        aberto={aberto}
        aoMudar={setAberto}
        titulo="Nova divisão"
        descricao="Medidas em centímetros."
        rodape={
          <>
            <Button variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button ocupado={aGravar} onClick={() => void adicionarDivisao()}>
              Adicionar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Campo etiqueta="Divisão" obrigatorio>
            <Input
              value={divisao}
              onChange={(evento) => setDivisao(evento.target.value)}
              placeholder="Sala, quarto 1, cozinha…"
            />
          </Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo etiqueta="Comprimento" obrigatorio>
              <Input
                inputMode="numeric"
                value={comprimento}
                onChange={(evento) => setComprimento(evento.target.value)}
              />
            </Campo>
            <Campo etiqueta="Largura" obrigatorio>
              <Input
                inputMode="numeric"
                value={largura}
                onChange={(evento) => setLargura(evento.target.value)}
              />
            </Campo>
            <Campo etiqueta="Pé direito" obrigatorio>
              <Input
                inputMode="numeric"
                value={peDireito}
                onChange={(evento) => setPeDireito(evento.target.value)}
              />
            </Campo>
          </div>
        </div>
      </Dialog>

      <Dialog
        aberto={vaoAberto !== null}
        aoMudar={(estado) => {
          if (!estado) setVaoAberto(null)
        }}
        titulo="Novo vão"
        descricao="Medidas em centímetros. As portas descontam no rodapé."
        rodape={
          <>
            <Button variante="secundario" onClick={() => setVaoAberto(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void adicionarVao()}>Adicionar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Campo etiqueta="Tipo">
            <Select valor={tipoVao} aoMudar={setTipoVao} opcoes={TIPOS_VAO} />
          </Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo etiqueta="Largura">
              <Input
                inputMode="numeric"
                value={larguraVao}
                onChange={(evento) => setLarguraVao(evento.target.value)}
              />
            </Campo>
            <Campo etiqueta="Altura">
              <Input
                inputMode="numeric"
                value={alturaVao}
                onChange={(evento) => setAlturaVao(evento.target.value)}
              />
            </Campo>
            <Campo etiqueta="Quantidade">
              <Input
                inputMode="numeric"
                value={quantidadeVao}
                onChange={(evento) => setQuantidadeVao(evento.target.value)}
              />
            </Campo>
          </div>
        </div>
      </Dialog>

      <ConfirmarDialog
        aberto={apagarDivisaoId !== null}
        aoMudar={(estado) => {
          if (!estado) setApagarDivisaoId(null)
        }}
        titulo="Apagar divisão"
        descricao="Esta divisão e os respetivos vãos vão ser apagados."
        ocupado={aApagarDivisao}
        aoConfirmar={() => void apagarDivisao()}
      />
    </div>
  )
}
