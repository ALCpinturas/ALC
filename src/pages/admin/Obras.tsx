import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Columns3, List, Plus } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import Cabecalho from '@/components/admin/Cabecalho'
import FormularioObra from '@/components/admin/FormularioObra'
import { FILTROS_OBRAS_INICIAIS, mudarEstadoObra, useObras, type FiltrosObras, type ObraComCliente } from '@/lib/hooks/useObras'
import { formatarEuros } from '@/lib/format'
import {
  ESTADOS_OBRA,
  ROTULO_ESTADO_OBRA,
  ROTULO_INTERVENCAO,
  TIPOS_INTERVENCAO,
} from '@/lib/schemas/comum'
import { useSeo } from '@/lib/useSeo'
import { cn } from '@/lib/cn'
import type { EstadoObra } from '@/types/database'

export default function Obras() {
  useSeo({ titulo: 'Obras — ALC', descricao: 'Gestão de obras.', naoIndexar: true })

  const [filtros, setFiltros] = useState<FiltrosObras>(FILTROS_OBRAS_INICIAIS)
  const [vista, setVista] = useState<'lista' | 'quadro'>('lista')
  const [nova, setNova] = useState(false)
  const { obras, aCarregar, erro, recarregar, setObras } = useObras(filtros)

  const porEstado = useMemo(() => {
    const mapa = new Map<EstadoObra, ObraComCliente[]>()
    for (const estado of ESTADOS_OBRA) mapa.set(estado, [])
    for (const obra of obras) mapa.get(obra.estado)?.push(obra)
    return mapa
  }, [obras])

  async function alterarEstado(obra: ObraComCliente, estado: EstadoObra) {
    if (obra.estado === estado) return
    const anterior = obra.estado
    setObras((atuais) => atuais.map((item) => (item.id === obra.id ? { ...item, estado } : item)))
    const erroMudanca = await mudarEstadoObra(obra.id, estado)
    if (erroMudanca) {
      setObras((atuais) =>
        atuais.map((item) => (item.id === obra.id ? { ...item, estado: anterior } : item)),
      )
      toast.error(`Não foi possível mudar o estado. ${erroMudanca}`)
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Obras"
        subtitulo={`${obras.length} ${obras.length === 1 ? 'obra' : 'obras'}`}
        acoes={
          <>
            <Button
              variante="secundario"
              tamanho="sm"
              className="hidden md:inline-flex"
              onClick={() => setVista((atual) => (atual === 'lista' ? 'quadro' : 'lista'))}
            >
              {vista === 'lista' ? (
                <Columns3 aria-hidden className="size-4" />
              ) : (
                <List aria-hidden className="size-4" />
              )}
              {vista === 'lista' ? 'Quadro' : 'Lista'}
            </Button>
            <Button tamanho="sm" onClick={() => setNova(true)}>
              <Plus aria-hidden className="size-4" />
              Nova obra
            </Button>
          </>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            valor={filtros.estado}
            aoMudar={(valor) => setFiltros((f) => ({ ...f, estado: valor as FiltrosObras['estado'] }))}
            opcoes={[
              { valor: 'todos', rotulo: 'Todos os estados' },
              ...ESTADOS_OBRA.map((estado) => ({ valor: estado, rotulo: ROTULO_ESTADO_OBRA[estado] })),
            ]}
          />
          <Select
            valor={filtros.tipo}
            aoMudar={(valor) => setFiltros((f) => ({ ...f, tipo: valor as FiltrosObras['tipo'] }))}
            opcoes={[
              { valor: 'todos', rotulo: 'Todos os trabalhos' },
              ...TIPOS_INTERVENCAO.map((tipo) => ({ valor: tipo, rotulo: ROTULO_INTERVENCAO[tipo] })),
            ]}
          />
        </div>

        {erro ? <EstadoErro mensagem={erro} aoRepetir={() => void recarregar()} /> : null}

        {aCarregar ? (
          <div className="space-y-2">
            {[0, 1, 2].map((indice) => (
              <Esqueleto key={indice} className="h-24 w-full" />
            ))}
          </div>
        ) : null}

        {!aCarregar && obras.length === 0 && !erro ? (
          <EstadoVazio
            titulo="Sem obras com estes filtros."
            acao={<Button onClick={() => setNova(true)}>Nova obra</Button>}
          />
        ) : null}

        {!aCarregar && obras.length > 0 && vista === 'lista' ? (
          <ul className="space-y-3">
            {obras.map((obra) => (
              <li key={obra.id} className="border border-alc-line bg-white">
                <Link to={`/admin/obras/${obra.id}`} className="block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-alc-ink">{obra.numero}</p>
                      <p className="truncate font-medium text-alc-black">{obra.titulo}</p>
                      <p className="mt-1 truncate text-sm text-alc-ink">
                        {obra.cliente?.nome ?? '—'}
                        {obra.localidade ? ` · ${obra.localidade}` : ''}
                      </p>
                    </div>
                    {obra.valor_adjudicado_cents ? (
                      <p className="shrink-0 text-sm font-medium">
                        {formatarEuros(obra.valor_adjudicado_cents)}
                      </p>
                    ) : null}
                  </div>
                </Link>
                {/* Mudar estado no telemóvel sem arrastar nada. */}
                <div className="border-t border-alc-line p-3">
                  <Select
                    valor={obra.estado}
                    aoMudar={(valor) => void alterarEstado(obra, valor as EstadoObra)}
                    opcoes={ESTADOS_OBRA.map((estado) => ({
                      valor: estado,
                      rotulo: ROTULO_ESTADO_OBRA[estado],
                    }))}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {!aCarregar && obras.length > 0 && vista === 'quadro' ? (
          <div className="hidden gap-4 overflow-x-auto md:grid md:grid-cols-5">
            {ESTADOS_OBRA.map((estado) => (
              <section
                key={estado}
                onDragOver={(evento) => evento.preventDefault()}
                onDrop={(evento) => {
                  const id = evento.dataTransfer.getData('text/plain')
                  const obra = obras.find((item) => item.id === id)
                  if (obra) void alterarEstado(obra, estado)
                }}
                className="min-h-40 rounded-[2px] bg-white p-2"
              >
                <h2 className="mb-2 px-1 text-xs uppercase tracking-wide text-alc-ink">
                  {ROTULO_ESTADO_OBRA[estado]} ({porEstado.get(estado)?.length ?? 0})
                </h2>
                <ul className="space-y-2">
                  {(porEstado.get(estado) ?? []).map((obra) => (
                    <li
                      key={obra.id}
                      draggable
                      onDragStart={(evento) => evento.dataTransfer.setData('text/plain', obra.id)}
                      className={cn('cursor-grab border border-alc-line p-2 text-sm')}
                    >
                      <Link to={`/admin/obras/${obra.id}`}>
                        <p className="text-xs text-alc-ink">{obra.numero}</p>
                        <p className="font-medium text-alc-black">{obra.titulo}</p>
                        <p className="truncate text-alc-ink">{obra.cliente?.nome ?? '—'}</p>
                        {obra.valor_adjudicado_cents ? (
                          <p className="mt-1">{formatarEuros(obra.valor_adjudicado_cents)}</p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}

        {vista === 'quadro' ? (
          <div className="md:hidden">
            <Badge tom="rosa">O quadro está disponível em ecrã maior.</Badge>
          </div>
        ) : null}
      </div>

      <FormularioObra
        aberto={nova}
        obra={null}
        aoFechar={() => setNova(false)}
        aoGuardar={() => void recarregar()}
      />
    </>
  )
}
