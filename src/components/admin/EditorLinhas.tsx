import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Checkbox from '@/components/ui/Checkbox'
import ConfirmarDialog from '@/components/ui/ConfirmarDialog'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { EstadoVazio } from '@/components/ui/Estados'
import {
  ROTULO_UNIDADE,
  totalLinhaCentimos,
  UNIDADES,
  type Unidade,
} from '@/lib/calculo/orcamento'
import {
  centimosParaInput,
  formatarEuros,
  formatarNumero,
  parseEurosParaCentimos,
  parseQuantidade,
} from '@/lib/format'
import { acrescentarAoCatalogo, useTiposTrabalho } from '@/lib/hooks/useTiposTrabalho'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { OrcamentoLinhaRow } from '@/types/database'

interface EditorLinhasProps {
  orcamentoId: string
  linhas: OrcamentoLinhaRow[]
  bloqueado: boolean
  aoMudar: () => void
}

interface Rascunho {
  id: string | null
  tipo: string
  capitulo: string
  descricao: string
  unidade: Unidade
  quantidade: string
  preco: string
}

const PERSONALIZADO = 'personalizado'

const VAZIO: Rascunho = {
  id: null,
  tipo: PERSONALIZADO,
  capitulo: 'Trabalhos',
  descricao: '',
  unidade: 'm2',
  quantidade: '1',
  preco: '0,00',
}

/**
 * Linhas como cartões, não como folha de cálculo. A edição acontece numa folha que sobe
 * de baixo, com teclado numérico, porque isto é preenchido em obra e não à secretária.
 */
export default function EditorLinhas({
  orcamentoId,
  linhas,
  bloqueado,
  aoMudar,
}: EditorLinhasProps) {
  const { tipos, recarregar: recarregarTipos } = useTiposTrabalho()
  const [rascunho, setRascunho] = useState<Rascunho | null>(null)
  const [aGravar, setAGravar] = useState(false)
  const [guardarNoCatalogo, setGuardarNoCatalogo] = useState(true)
  const [apagarId, setApagarId] = useState<string | null>(null)
  const [aApagar, setAApagar] = useState(false)

  const opcoesTipo = useMemo(
    () => [
      ...tipos.map((tipo) => ({
        valor: tipo.id,
        rotulo: `${tipo.capitulo} · ${tipo.descricao}`,
      })),
      { valor: PERSONALIZADO, rotulo: 'Outro, escrever à mão' },
    ],
    [tipos],
  )

  /** Escolher o tipo preenche descrição, capítulo, unidade e preço. Tudo continua editável. */
  function escolherTipo(idTipo: string) {
    if (!rascunho) return
    if (idTipo === PERSONALIZADO) {
      setRascunho({ ...rascunho, tipo: PERSONALIZADO })
      return
    }
    const tipo = tipos.find((t) => t.id === idTipo)
    if (!tipo) return
    setRascunho({
      ...rascunho,
      tipo: tipo.id,
      capitulo: tipo.capitulo,
      descricao: tipo.descricao,
      unidade: tipo.unidade,
      preco: centimosParaInput(tipo.preco_min_cents),
    })
  }

  const porCapitulo = useMemo(() => {
    const mapa = new Map<string, OrcamentoLinhaRow[]>()
    for (const linha of linhas) {
      const atual = mapa.get(linha.capitulo) ?? []
      atual.push(linha)
      mapa.set(linha.capitulo, atual)
    }
    return [...mapa.entries()]
  }, [linhas])

  const previsao = useMemo(() => {
    if (!rascunho) return 0
    const quantidade = parseQuantidade(rascunho.quantidade) ?? 0
    const preco = parseEurosParaCentimos(rascunho.preco) ?? 0
    return totalLinhaCentimos(quantidade, preco)
  }, [rascunho])

  async function guardar() {
    if (!rascunho) return
    const quantidade = parseQuantidade(rascunho.quantidade)
    const preco = parseEurosParaCentimos(rascunho.preco)

    if (rascunho.descricao.trim().length < 3) {
      toast.error('Descreva o trabalho.')
      return
    }
    if (quantidade === null || quantidade < 0) {
      toast.error('A quantidade não é válida.')
      return
    }
    if (preco === null || preco < 0) {
      toast.error('O preço unitário não é válido.')
      return
    }

    const registo = {
      orcamento_id: orcamentoId,
      capitulo: rascunho.capitulo.trim() || 'Trabalhos',
      descricao: rascunho.descricao.trim(),
      unidade: rascunho.unidade,
      quantidade,
      preco_unitario_cents: preco,
      total_linha_cents: totalLinhaCentimos(quantidade, preco),
    }

    setAGravar(true)
    const { error } = rascunho.id
      ? await supabase.from('orcamento_linhas').update(registo).eq('id', rascunho.id)
      : await supabase.from('orcamento_linhas').insert({ ...registo, ordem: linhas.length })

    if (error) {
      setAGravar(false)
      toast.error(`Não foi possível guardar a linha. ${mensagemErro(error)}`)
      return
    }

    // Um trabalho escrito à mão fica no catálogo, para da próxima já estar no menu.
    if (rascunho.tipo === PERSONALIZADO && guardarNoCatalogo) {
      const falha = await acrescentarAoCatalogo(
        {
          descricao: registo.descricao,
          capitulo: registo.capitulo,
          unidade: registo.unidade,
          preco_min_cents: registo.preco_unitario_cents,
          preco_max_cents: registo.preco_unitario_cents,
        },
        tipos.map((t) => t.chave),
        Math.max(0, ...tipos.map((t) => t.ordem)) + 10,
      )

      if (falha) {
        // A linha ficou guardada: isto é um extra, não pode passar por um erro da linha.
        toast.error(`A linha ficou guardada, mas não entrou no catálogo. ${falha}`)
      } else {
        await recarregarTipos()
        toast.success(`"${registo.descricao}" ficou nos tipos de trabalho.`)
      }
    }

    setAGravar(false)
    setRascunho(null)
    aoMudar()
  }

  async function apagar() {
    if (!apagarId) return
    setAApagar(true)
    const { error } = await supabase.from('orcamento_linhas').delete().eq('id', apagarId)
    setAApagar(false)
    if (error) {
      toast.error(`Não foi possível apagar. ${mensagemErro(error)}`)
      return
    }
    setApagarId(null)
    setRascunho(null)
    aoMudar()
  }

  async function mover(linha: OrcamentoLinhaRow, direcao: -1 | 1) {
    const indice = linhas.findIndex((item) => item.id === linha.id)
    const vizinho = linhas[indice + direcao]
    if (!vizinho) return
    const { error } = await supabase.from('orcamento_linhas').upsert([
      { ...linha, ordem: vizinho.ordem },
      { ...vizinho, ordem: linha.ordem },
    ])
    if (error) {
      toast.error(`Não foi possível reordenar. ${mensagemErro(error)}`)
      return
    }
    aoMudar()
  }

  return (
    <div className="space-y-4">
      {!bloqueado ? (
        <Button onClick={() => setRascunho(VAZIO)}>
          <Plus aria-hidden className="size-4" />
          Adicionar linha
        </Button>
      ) : null}

      {linhas.length === 0 ? (
        <EstadoVazio
          titulo="O orçamento ainda não tem linhas."
          descricao="Gere as linhas a partir das medições ou acrescente uma linha manualmente."
        />
      ) : (
        <div className="space-y-6">
          {porCapitulo.map(([capitulo, doCapitulo]) => (
            <section key={capitulo}>
              <h3 className="mb-2 text-xs uppercase tracking-wide text-alc-rose-deep">{capitulo}</h3>
              <ul className="space-y-2">
                {doCapitulo.map((linha) => (
                  <li key={linha.id} className="border border-alc-line bg-white">
                    <button
                      type="button"
                      disabled={bloqueado}
                      onClick={() =>
                        setRascunho({
                          id: linha.id,
                          tipo:
                            tipos.find((t) => t.descricao === linha.descricao)?.id ?? PERSONALIZADO,
                          capitulo: linha.capitulo,
                          descricao: linha.descricao,
                          unidade: linha.unidade,
                          quantidade: formatarNumero(linha.quantidade),
                          preco: centimosParaInput(linha.preco_unitario_cents),
                        })
                      }
                      className="w-full p-4 text-left disabled:opacity-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-medium text-alc-black">{linha.descricao}</p>
                        <p className="shrink-0 text-sm font-medium">
                          {formatarEuros(linha.total_linha_cents)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-alc-ink">
                        {formatarNumero(linha.quantidade)} {ROTULO_UNIDADE[linha.unidade]} ×{' '}
                        {formatarEuros(linha.preco_unitario_cents)}
                      </p>
                    </button>

                    {!bloqueado ? (
                      <div className="flex justify-end gap-1 border-t border-alc-line p-1">
                        <button
                          type="button"
                          aria-label="Mover para cima"
                          onClick={() => void mover(linha, -1)}
                          className="toque flex items-center justify-center text-alc-ink"
                        >
                          <ChevronUp aria-hidden className="size-5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Mover para baixo"
                          onClick={() => void mover(linha, 1)}
                          className="toque flex items-center justify-center text-alc-ink"
                        >
                          <ChevronDown aria-hidden className="size-5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Apagar linha"
                          onClick={() => setApagarId(linha.id)}
                          className="toque flex items-center justify-center text-alc-rose-deep"
                        >
                          <Trash2 aria-hidden className="size-5" />
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Dialog
        aberto={rascunho !== null}
        aoMudar={(estado) => {
          if (!estado) setRascunho(null)
        }}
        titulo={rascunho?.id ? 'Editar linha' : 'Nova linha'}
        rodape={
          <>
            <Button variante="secundario" onClick={() => setRascunho(null)}>
              Cancelar
            </Button>
            <Button ocupado={aGravar} onClick={() => void guardar()}>
              Guardar
            </Button>
          </>
        }
      >
        {rascunho ? (
          <div className="space-y-4">
            <Campo
              etiqueta="Tipo de trabalho"
              ajuda="Escolher um tipo preenche a descrição, a unidade e o preço."
            >
              <Select
                valor={rascunho.tipo}
                aoMudar={escolherTipo}
                opcoes={opcoesTipo}
                marcador="Escolher trabalho"
              />
            </Campo>
            <Campo etiqueta="Descrição" obrigatorio>
              <Input
                value={rascunho.descricao}
                onChange={(evento) => setRascunho({ ...rascunho, descricao: evento.target.value })}
              />
            </Campo>
            <Campo etiqueta="Capítulo" ajuda="Agrupa as linhas no orçamento e no PDF">
              <Input
                value={rascunho.capitulo}
                onChange={(evento) => setRascunho({ ...rascunho, capitulo: evento.target.value })}
              />
            </Campo>
            <div className="grid grid-cols-3 gap-3">
              <Campo etiqueta="Unidade">
                <Select
                  valor={rascunho.unidade}
                  aoMudar={(valor) => setRascunho({ ...rascunho, unidade: valor as Unidade })}
                  opcoes={UNIDADES.map((unidade) => ({
                    valor: unidade,
                    rotulo: ROTULO_UNIDADE[unidade],
                  }))}
                />
              </Campo>
              <Campo etiqueta="Quantidade">
                <Input
                  inputMode="decimal"
                  value={rascunho.quantidade}
                  onChange={(evento) =>
                    setRascunho({ ...rascunho, quantidade: evento.target.value })
                  }
                />
              </Campo>
              <Campo etiqueta="Preço unitário">
                <Input
                  inputMode="decimal"
                  value={rascunho.preco}
                  onChange={(evento) => setRascunho({ ...rascunho, preco: evento.target.value })}
                />
              </Campo>
            </div>
            {rascunho.tipo === PERSONALIZADO ? (
              <Checkbox marcado={guardarNoCatalogo} aoMudar={setGuardarNoCatalogo}>
                Guardar nos tipos de trabalho, para da próxima já aparecer no menu.
              </Checkbox>
            ) : null}

            <p className="border-t border-alc-line pt-3 text-right text-sm">
              Total da linha:{' '}
              <span className="font-medium text-alc-black">{formatarEuros(previsao)}</span>
            </p>
          </div>
        ) : null}
      </Dialog>

      <ConfirmarDialog
        aberto={apagarId !== null}
        aoMudar={(aberto) => {
          if (!aberto) setApagarId(null)
        }}
        titulo="Apagar linha"
        descricao="Esta linha vai ser removida do orçamento."
        ocupado={aApagar}
        aoConfirmar={() => void apagar()}
      />
    </div>
  )
}
