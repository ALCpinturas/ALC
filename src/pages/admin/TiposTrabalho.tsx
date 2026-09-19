import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Checkbox from '@/components/ui/Checkbox'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import { ROTULO_UNIDADE, UNIDADES, type Unidade } from '@/lib/calculo/orcamento'
import { centimosParaInput, formatarEuros, parseEurosParaCentimos } from '@/lib/format'
import {
  chaveAPartirDe,
  guardarTipoTrabalho,
  useTiposTrabalho,
} from '@/lib/hooks/useTiposTrabalho'
import { useSeo } from '@/lib/useSeo'
import type { PrecoUnitarioRow } from '@/types/database'

interface Rascunho {
  id: string | null
  descricao: string
  capitulo: string
  unidade: Unidade
  precoMin: string
  precoMax: string
  ordem: string
  ativo: boolean
}

const NOVO: Rascunho = {
  id: null,
  descricao: '',
  capitulo: 'Trabalhos',
  unidade: 'm2',
  precoMin: '0,00',
  precoMax: '0,00',
  ordem: '100',
  ativo: true,
}

function rascunhoDe(tipo: PrecoUnitarioRow): Rascunho {
  return {
    id: tipo.id,
    descricao: tipo.descricao,
    capitulo: tipo.capitulo,
    unidade: tipo.unidade,
    precoMin: centimosParaInput(tipo.preco_min_cents),
    precoMax: centimosParaInput(tipo.preco_max_cents),
    ordem: String(tipo.ordem),
    ativo: tipo.ativo,
  }
}

export default function TiposTrabalho() {
  useSeo({ titulo: 'Tipos de trabalho — ALC', descricao: 'Catálogo.', naoIndexar: true })

  const { tipos, aCarregar, erro, recarregar } = useTiposTrabalho(false)
  const [rascunho, setRascunho] = useState<Rascunho | null>(null)
  const [aGuardar, setAGuardar] = useState(false)

  async function guardar() {
    if (!rascunho) return
    const min = parseEurosParaCentimos(rascunho.precoMin)
    const max = parseEurosParaCentimos(rascunho.precoMax)

    if (rascunho.descricao.trim().length < 3) {
      toast.error('Dê um nome ao tipo de trabalho.')
      return
    }
    if (min === null || max === null || min < 0 || max < 0) {
      toast.error('Os preços não são válidos.')
      return
    }
    if (max > 0 && max < min) {
      toast.error('O preço máximo não pode ser inferior ao mínimo.')
      return
    }

    setAGuardar(true)
    const falha = await guardarTipoTrabalho(rascunho.id, {
      chave: rascunho.id
        ? (tipos.find((t) => t.id === rascunho.id)?.chave ?? chaveAPartirDe(rascunho.descricao))
        : chaveAPartirDe(rascunho.descricao),
      descricao: rascunho.descricao.trim(),
      capitulo: rascunho.capitulo.trim() || 'Trabalhos',
      unidade: rascunho.unidade,
      preco_min_cents: min,
      preco_max_cents: max,
      ativo: rascunho.ativo,
      ordem: Number(rascunho.ordem) || 100,
    })
    setAGuardar(false)

    if (falha) {
      toast.error(`Não foi possível guardar. ${falha}`)
      return
    }
    setRascunho(null)
    void recarregar()
  }

  const semPreco = tipos.filter((t) => t.ativo && t.preco_max_cents === 0).length

  return (
    <>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-alc-ink">
            Usados nas linhas de orçamento e na estimativa interna das leads.
          </p>
          <Button tamanho="sm" onClick={() => setRascunho(NOVO)}>
            <Plus aria-hidden className="size-4" />
            Novo tipo
          </Button>
        </div>

        {semPreco > 0 ? (
          <p className="border-l-2 border-alc-rose-dark bg-alc-rose-light p-3 text-sm">
            {semPreco} {semPreco === 1 ? 'tipo ativo está' : 'tipos ativos estão'} sem preço. A
            linha de orçamento entra a zero e a estimativa interna da lead fica sem valor.
          </p>
        ) : null}

        {erro ? <EstadoErro mensagem={erro} aoRepetir={() => void recarregar()} /> : null}

        {aCarregar ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Esqueleto key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : null}

        {!aCarregar && tipos.length === 0 && !erro ? (
          <EstadoVazio
            titulo="Ainda não há tipos de trabalho."
            acao={<Button onClick={() => setRascunho(NOVO)}>Criar o primeiro</Button>}
          />
        ) : null}

        {!aCarregar && tipos.length > 0 ? (
          <ul className="space-y-2">
            {tipos.map((tipo) => (
              <li key={tipo.id}>
                <button
                  type="button"
                  onClick={() => setRascunho(rascunhoDe(tipo))}
                  className="w-full border border-alc-line bg-white p-4 text-left hover:border-alc-rose-dark"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-alc-rose-deep">
                        {tipo.capitulo}
                      </p>
                      <p className="truncate font-medium text-alc-black">{tipo.descricao}</p>
                      <p className="mt-1 text-sm text-alc-ink">
                        {ROTULO_UNIDADE[tipo.unidade]} ·{' '}
                        {tipo.preco_max_cents === 0
                          ? 'sem preço definido'
                          : `${formatarEuros(tipo.preco_min_cents)} a ${formatarEuros(tipo.preco_max_cents)}`}
                      </p>
                    </div>
                    {!tipo.ativo ? <Badge tom="neutro">Inativo</Badge> : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Dialog
        aberto={rascunho !== null}
        aoMudar={(aberto) => {
          if (!aberto) setRascunho(null)
        }}
        titulo={rascunho?.id ? 'Editar tipo de trabalho' : 'Novo tipo de trabalho'}
        rodape={
          <>
            <Button variante="secundario" onClick={() => setRascunho(null)}>
              Cancelar
            </Button>
            <Button ocupado={aGuardar} onClick={() => void guardar()}>
              Guardar
            </Button>
          </>
        }
      >
        {rascunho ? (
          <div className="space-y-4">
            <Campo etiqueta="Nome" obrigatorio>
              <Input
                value={rascunho.descricao}
                onChange={(e) => setRascunho({ ...rascunho, descricao: e.target.value })}
                placeholder="Pintura de paredes e tetos"
              />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Capítulo" ajuda="Agrupa as linhas no orçamento e no PDF">
                <Input
                  value={rascunho.capitulo}
                  onChange={(e) => setRascunho({ ...rascunho, capitulo: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Unidade">
                <Select
                  valor={rascunho.unidade}
                  aoMudar={(v) => setRascunho({ ...rascunho, unidade: v as Unidade })}
                  opcoes={UNIDADES.map((u) => ({ valor: u, rotulo: ROTULO_UNIDADE[u] }))}
                />
              </Campo>
              <Campo etiqueta="Preço mínimo" ajuda="Por unidade">
                <Input
                  inputMode="decimal"
                  value={rascunho.precoMin}
                  onChange={(e) => setRascunho({ ...rascunho, precoMin: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Preço máximo" ajuda="Topo da estimativa interna das leads">
                <Input
                  inputMode="decimal"
                  value={rascunho.precoMax}
                  onChange={(e) => setRascunho({ ...rascunho, precoMax: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Ordem" ajuda="Menor aparece primeiro">
                <Input
                  inputMode="numeric"
                  value={rascunho.ordem}
                  onChange={(e) => setRascunho({ ...rascunho, ordem: e.target.value })}
                />
              </Campo>
            </div>
            <Checkbox
              marcado={rascunho.ativo}
              aoMudar={(marcado) => setRascunho({ ...rascunho, ativo: marcado })}
            >
              Ativo: aparece no menu de escolha das linhas de orçamento.
            </Checkbox>
          </div>
        ) : null}
      </Dialog>
    </>
  )
}
