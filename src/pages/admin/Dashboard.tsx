import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import Cabecalho from '@/components/admin/Cabecalho'
import { fimDoDiaLisboa, formatarData, formatarEuros, inicioDoDiaLisboa, lisboaParaUTC } from '@/lib/format'
import { FILTROS_ORCAMENTOS_INICIAIS, useOrcamentos } from '@/lib/hooks/useOrcamentos'
import { ROTULO_ESTADO_OBRA, ROTULO_ESTADO_ORCAMENTO } from '@/lib/schemas/comum'
import { mensagemErro, supabase } from '@/lib/supabase'
import { useSeo } from '@/lib/useSeo'
import type { EstadoObra, LeadUnificada, MetricasPeriodo, ObraRow } from '@/types/database'

// recharts só entra no pacote de quem abre o dashboard.
const Graficos = lazy(() => import('@/components/admin/Graficos'))

type Periodo = 'este_mes' | 'mes_passado' | 'ultimos_90' | 'este_ano'

const PERIODOS = [
  { valor: 'este_mes', rotulo: 'Este mês' },
  { valor: 'mes_passado', rotulo: 'Mês passado' },
  { valor: 'ultimos_90', rotulo: 'Últimos 90 dias' },
  { valor: 'este_ano', rotulo: 'Este ano' },
]

function limites(periodo: Periodo): { inicio: Date; fim: Date } {
  const agora = new Date()
  const ano = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric' }).format(agora))
  const mes = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', month: 'numeric' }).format(agora))

  switch (periodo) {
    case 'mes_passado': {
      const anoAnterior = mes === 1 ? ano - 1 : ano
      const mesAnterior = mes === 1 ? 12 : mes - 1
      return {
        inicio: lisboaParaUTC(anoAnterior, mesAnterior, 1),
        fim: new Date(lisboaParaUTC(ano, mes, 1).getTime() - 1),
      }
    }
    case 'ultimos_90': {
      const fim = fimDoDiaLisboa(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(agora))
      const inicio = new Date(fim.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { inicio, fim }
    }
    case 'este_ano':
      return { inicio: lisboaParaUTC(ano, 1, 1), fim: fimDoDiaLisboa(`${ano}-12-31`) }
    default:
      return {
        inicio: lisboaParaUTC(ano, mes, 1),
        fim: fimDoDiaLisboa(
          new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(agora),
        ),
      }
  }
}

export default function Dashboard() {
  useSeo({ titulo: 'Início — ALC', descricao: 'Indicadores.', naoIndexar: true })

  const [periodo, setPeriodo] = useState<Periodo>('este_mes')
  const [metricas, setMetricas] = useState<MetricasPeriodo | null>(null)
  const [recentes, setRecentes] = useState<LeadUnificada[]>([])
  const [aTerminar, setATerminar] = useState<ObraRow[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const intervalo = useMemo(() => limites(periodo), [periodo])
  const { orcamentos: orcamentosRecentes } = useOrcamentos(FILTROS_ORCAMENTOS_INICIAIS, 5)

  useEffect(() => {
    let ativo = true
    setACarregar(true)

    async function carregar() {
      const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
      const daquiATrintaDias = new Date(inicioDoDiaLisboa(hoje).getTime() + 30 * 24 * 60 * 60 * 1000)

      const [resultadoMetricas, resultadoRecentes, resultadoObras] = await Promise.all([
        supabase.rpc('metricas_periodo', {
          p_inicio: intervalo.inicio.toISOString(),
          p_fim: intervalo.fim.toISOString(),
        }),
        supabase
          .from('leads_unificadas')
          .select('*')
          .order('criado_em', { ascending: false })
          .limit(5),
        supabase
          .from('obras')
          .select('*')
          .in('estado', ['adjudicada', 'em_curso'])
          .not('data_fim_prevista', 'is', null)
          .lte('data_fim_prevista', daquiATrintaDias.toISOString().slice(0, 10))
          .order('data_fim_prevista', { ascending: true }),
      ])

      if (!ativo) return

      setErro(resultadoMetricas.error ? mensagemErro(resultadoMetricas.error) : null)
      setMetricas((resultadoMetricas.data as MetricasPeriodo | null) ?? null)
      setRecentes((resultadoRecentes.data ?? []) as LeadUnificada[])
      setATerminar(resultadoObras.data ?? [])
      setACarregar(false)
    }

    void carregar()
    return () => {
      ativo = false
    }
  }, [intervalo])

  const indicadores = metricas
    ? [
        { rotulo: 'Leads recebidas', valor: String(metricas.leads_total) },
        { rotulo: 'Orçamentos emitidos', valor: String(metricas.orcamentos_emitidos) },
        { rotulo: 'Orçamentos aceites', valor: String(metricas.orcamentos_aceites) },
        { rotulo: 'Valor adjudicado', valor: formatarEuros(metricas.valor_adjudicado_cents) },
        { rotulo: 'Por aceitar', valor: formatarEuros(metricas.valor_por_aceitar_cents) },
        {
          rotulo: 'Mediana até 1.º contacto',
          valor:
            metricas.mediana_horas_primeiro_contacto === null
              ? '—'
              : `${Math.round(metricas.mediana_horas_primeiro_contacto)} h`,
        },
      ]
    : []

  return (
    <>
      <Cabecalho titulo="Início" subtitulo="Indicadores do período" />

      <div className="space-y-6 p-4 md:p-6">
        <div className="max-w-xs">
          <Select
            valor={periodo}
            aoMudar={(valor) => setPeriodo(valor as Periodo)}
            opcoes={PERIODOS}
          />
        </div>

        {erro ? <EstadoErro mensagem={erro} /> : null}

        {aCarregar ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((indice) => (
              <Esqueleto key={indice} className="h-24 w-full" />
            ))}
          </div>
        ) : null}

        {!aCarregar && metricas ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {indicadores.map((indicador) => (
                <div key={indicador.rotulo} className="border border-alc-line bg-white p-4">
                  <p className="font-display text-2xl text-alc-black">{indicador.valor}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-alc-ink">
                    {indicador.rotulo}
                  </p>
                </div>
              ))}
            </div>

            <Suspense fallback={<Esqueleto className="h-64 w-full" />}>
              <Graficos metricas={metricas} />
            </Suspense>
          </>
        ) : null}

        {/* Os orçamentos são o trabalho do dia a dia: ficam à mão, não escondidos numa obra. */}
        <section className="border border-alc-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg text-alc-black">Orçamentos</h2>
            <div className="flex flex-wrap gap-2">
              <Button asChild tamanho="sm">
                <Link to="/admin/orcamentos">
                  <Plus aria-hidden className="size-4" />
                  Novo orçamento
                </Link>
              </Button>
            </div>
          </div>

          {orcamentosRecentes.length === 0 ? (
            <p className="mt-3 text-sm text-alc-ink">
              Ainda não há orçamentos. Um orçamento começa no cliente; a obra liga-se depois.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {orcamentosRecentes.map((orcamento) => (
                <li key={orcamento.id}>
                  <Link
                    to={`/admin/orcamentos/${orcamento.id}`}
                    className="flex items-center justify-between gap-3 border border-alc-line p-3 text-sm hover:border-alc-rose-dark"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-alc-black">
                        {orcamento.cliente?.nome ?? 'Sem cliente'}
                      </span>
                      <span className="block text-xs text-alc-ink">
                        {orcamento.numero} · {ROTULO_ESTADO_ORCAMENTO[orcamento.estado]}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatarEuros(orcamento.total_cents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg text-alc-black">Últimas leads</h2>
          {recentes.length === 0 ? (
            <EstadoVazio titulo="Ainda não há pedidos." />
          ) : (
            <ul className="space-y-2">
              {recentes.map((lead) => (
                <li key={`${lead.tabela}-${lead.id}`}>
                  <Link
                    to="/admin/leads"
                    className="flex items-center justify-between gap-3 border border-alc-line bg-white p-3 text-sm"
                  >
                    <span className="truncate">{lead.nome}</span>
                    <span className="shrink-0 text-alc-ink">{formatarData(lead.criado_em)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg text-alc-black">Obras a terminar em 30 dias</h2>
          {aTerminar.length === 0 ? (
            <EstadoVazio titulo="Nenhuma obra termina nos próximos 30 dias." />
          ) : (
            <ul className="space-y-2">
              {aTerminar.map((obra) => (
                <li key={obra.id}>
                  <Link
                    to={`/admin/obras/${obra.id}`}
                    className="flex items-center justify-between gap-3 border border-alc-line bg-white p-3 text-sm"
                  >
                    <span className="truncate">
                      {obra.numero} · {obra.titulo}
                    </span>
                    <span className="shrink-0 text-alc-ink">
                      {ROTULO_ESTADO_OBRA[obra.estado as EstadoObra]} ·{' '}
                      {formatarData(obra.data_fim_prevista)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
