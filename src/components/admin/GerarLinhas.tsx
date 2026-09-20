import { useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { resumoDivisao, type Divisao } from '@/lib/calculo/medicoes'
import { totalLinhaCentimos } from '@/lib/calculo/orcamento'
import { formatarNumero } from '@/lib/format'
import { mensagemErro, supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import type { MedicaoComVaos } from '@/lib/hooks/useOrcamento'
import type { PrecoUnitarioRow, UnidadeLinha } from '@/types/database'

type Grandeza = keyof ReturnType<typeof resumoDivisao>

/** Que grandeza medida alimenta cada trabalho do catálogo de origem. */
const BASE_POR_CHAVE: Record<string, Grandeza> = {
  pintura: 'paredes',
  tetos_falsos: 'teto',
  divisorias: 'paredes',
  pavimento: 'pavimento',
  acabamentos: 'paredes',
  remodelacao_geral: 'pavimento',
  rodape: 'rodape',
  estuque: 'paredes',
  preparacao_superficie: 'paredes',
}

/**
 * Para tipos de trabalho criados na aplicação não há mapa: decide-se pela unidade.
 * Metros lineares medem-se ao rodapé, metros quadrados ao pavimento.
 */
function grandezaDe(chave: string, unidade: string): Grandeza {
  return BASE_POR_CHAVE[chave] ?? (unidade === 'ml' ? 'rodape' : 'pavimento')
}

interface GerarLinhasProps {
  aberto: boolean
  aoFechar: () => void
  orcamentoId: string
  medicoes: MedicaoComVaos[]
  precos: PrecoUnitarioRow[]
  ordemInicial: number
  aoGerar: () => void
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

export default function GerarLinhas({
  aberto,
  aoFechar,
  orcamentoId,
  medicoes,
  precos,
  ordemInicial,
  aoGerar,
}: GerarLinhasProps) {
  const [divisoes, setDivisoes] = useState<string[]>([])
  const [trabalhos, setTrabalhos] = useState<string[]>([])
  const [aGerar, setAGerar] = useState(false)

  function alternar(lista: string[], valor: string): string[] {
    return lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor]
  }

  async function gerar() {
    if (divisoes.length === 0 || trabalhos.length === 0) {
      toast.error('Escolha pelo menos uma divisão e um trabalho.')
      return
    }

    setAGerar(true)
    const novas: {
      orcamento_id: string
      capitulo: string
      ordem: number
      descricao: string
      unidade: UnidadeLinha
      quantidade: number
      total_linha_cents: number
      preco_unitario_cents: number
    }[] = []

    let ordem = ordemInicial
    for (const chave of trabalhos) {
      const preco = precos.find((item) => item.chave === chave)
      if (!preco) continue
      const base = grandezaDe(chave, preco.unidade)

      for (const id of divisoes) {
        const medicao = medicoes.find((item) => item.id === id)
        if (!medicao) continue
        const resumo = resumoDivisao(paraDivisao(medicao))
        const quantidade = resumo[base]
        if (quantidade <= 0) continue

        novas.push({
          orcamento_id: orcamentoId,
          capitulo: preco.capitulo,
          ordem: ordem += 1,
          descricao: `${preco.descricao} — ${medicao.divisao}`,
          unidade: preco.unidade,
          quantidade,
          preco_unitario_cents: preco.preco_cents,
          total_linha_cents: totalLinhaCentimos(quantidade, preco.preco_cents),
        })
      }
    }

    if (novas.length === 0) {
      setAGerar(false)
      toast.error('Nada a gerar com esta combinação.')
      return
    }

    const { error } = await supabase.from('orcamento_linhas').insert(novas)
    setAGerar(false)
    if (error) {
      toast.error(`Não foi possível gerar as linhas. ${mensagemErro(error)}`)
      return
    }
    toast.success(`${novas.length} linhas geradas. Confirme quantidades e preços.`)
    setDivisoes([])
    setTrabalhos([])
    aoGerar()
    aoFechar()
  }

  return (
    <Dialog
      aberto={aberto}
      aoMudar={(estado) => {
        if (!estado) aoFechar()
      }}
      titulo="Gerar linhas a partir das medições"
      descricao="Ponto de partida. As linhas ficam editáveis e os preços entram pelo catálogo."
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button ocupado={aGerar} onClick={() => void gerar()}>
            Gerar
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium text-alc-black">Divisões</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {medicoes.map((medicao) => {
              const resumo = resumoDivisao(paraDivisao(medicao))
              const escolhida = divisoes.includes(medicao.id)
              return (
                <button
                  key={medicao.id}
                  type="button"
                  aria-pressed={escolhida}
                  onClick={() => setDivisoes((atuais) => alternar(atuais, medicao.id))}
                  className={cn(
                    'toque rounded-[2px] border px-3 py-2 text-left text-sm',
                    escolhida ? 'border-alc-rose-dark bg-alc-rose-light' : 'border-alc-line',
                  )}
                >
                  <span className="block font-medium">{medicao.divisao}</span>
                  <span className="block text-alc-ink">
                    {formatarNumero(resumo.pavimento)} m² · paredes {formatarNumero(resumo.paredes)} m²
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-alc-black">Trabalhos</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {precos.map((preco) => {
              const escolhido = trabalhos.includes(preco.chave)
              return (
                <button
                  key={preco.chave}
                  type="button"
                  aria-pressed={escolhido}
                  onClick={() => setTrabalhos((atuais) => alternar(atuais, preco.chave))}
                  className={cn(
                    'toque rounded-[2px] border px-3 py-2 text-left text-sm',
                    escolhido ? 'border-alc-rose-dark bg-alc-rose-light' : 'border-alc-line',
                  )}
                >
                  <span className="block font-medium">{preco.descricao}</span>
                  <span className="block text-alc-ink">
                    {preco.capitulo} · base {grandezaDe(preco.chave, preco.unidade)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
