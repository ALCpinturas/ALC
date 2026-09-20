import { useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmarDialog from '@/components/ui/ConfirmarDialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import Cabecalho from '@/components/admin/Cabecalho'
import PainelLead from '@/components/admin/PainelLead'
import { descarregarCsv } from '@/lib/csv'
import { formatarArea, formatarDataHora, formatarEuros, formatarTelefone } from '@/lib/format'
import { apagarLead, FILTROS_INICIAIS, POR_PAGINA, useLeads, type FiltrosLeads } from '@/lib/hooks/useLeads'
import { ESTADOS_LEAD, ROTULO_ESTADO_LEAD, ROTULO_INTERVENCAO } from '@/lib/schemas/comum'
import { useSeo } from '@/lib/useSeo'
import type { EstadoLead, LeadUnificada } from '@/types/database'

const OPCOES_ESTADO = [
  { valor: 'todos', rotulo: 'Todos os estados' },
  ...ESTADOS_LEAD.map((estado) => ({ valor: estado, rotulo: ROTULO_ESTADO_LEAD[estado] })),
]

const OPCOES_ORIGEM = [
  { valor: 'todas', rotulo: 'Todas as origens' },
  { valor: 'formulario', rotulo: 'Formulário' },
  { valor: 'calculadora', rotulo: 'Calculadora' },
]

export default function Leads() {
  useSeo({ titulo: 'Leads — ALC', descricao: 'Gestão de pedidos.', naoIndexar: true })

  const [filtros, setFiltros] = useState<FiltrosLeads>(FILTROS_INICIAIS)
  const [pesquisa, setPesquisa] = useState('')
  const [pagina, setPagina] = useState(0)
  const [aberta, setAberta] = useState<LeadUnificada | null>(null)
  const [apagarAlvo, setApagarAlvo] = useState<LeadUnificada | null>(null)
  const [aApagar, setAApagar] = useState(false)

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setFiltros((anteriores) => ({ ...anteriores, pesquisa }))
      setPagina(0)
    }, 300)
    return () => clearTimeout(temporizador)
  }, [pesquisa])

  const { leads, total, aCarregar, erro, recarregar } = useLeads(filtros, pagina)
  const [locais, setLocais] = useState<LeadUnificada[]>([])

  useEffect(() => setLocais(leads), [leads])

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  const selecionada = useMemo(
    () => (aberta ? (locais.find((lead) => lead.id === aberta.id) ?? aberta) : null),
    [aberta, locais],
  )

  function atualizarLeadLocal(id: string, alteracoes: Partial<LeadUnificada>) {
    setLocais((anteriores) =>
      anteriores.map((lead) => (lead.id === id ? { ...lead, ...alteracoes } : lead)),
    )
  }

  function mudarEstadoLocal(id: string, estado: EstadoLead) {
    atualizarLeadLocal(id, { estado })
  }

  async function apagar() {
    if (!apagarAlvo) return
    setAApagar(true)
    const erro = await apagarLead(apagarAlvo)
    setAApagar(false)
    if (erro) {
      toast.error(`Não foi possível apagar o pedido. ${erro}`)
      return
    }
    setApagarAlvo(null)
    if (aberta?.id === apagarAlvo.id) setAberta(null)
    toast.success('Pedido apagado.')
    void recarregar()
  }

  function exportar() {
    descarregarCsv(
      `leads-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Data', 'Nome', 'Telefone', 'Email', 'Localidade', 'Intervenção', 'Área m2', 'Origem', 'Estimativa interna', 'Estado'],
      locais.map((lead) => [
        formatarDataHora(lead.criado_em),
        lead.nome,
        lead.telefone,
        lead.email,
        lead.localidade,
        lead.tipo_intervencao ? ROTULO_INTERVENCAO[lead.tipo_intervencao] : '',
        lead.area_m2 ?? '',
        lead.origem === 'calculadora' ? 'Calculadora' : 'Formulário',
        lead.valor_estimado_cents ? formatarEuros(lead.valor_estimado_cents) : '',
        ROTULO_ESTADO_LEAD[lead.estado],
      ]),
    )
  }

  return (
    <>
      <Cabecalho
        titulo="Leads"
        subtitulo={`${total} ${total === 1 ? 'pedido' : 'pedidos'}`}
        acoes={
          <Button variante="secundario" tamanho="sm" onClick={exportar} disabled={locais.length === 0}>
            <Download aria-hidden className="size-4" />
            Exportar CSV
          </Button>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-alc-ink" />
            <Input
              value={pesquisa}
              onChange={(evento) => setPesquisa(evento.target.value)}
              placeholder="Nome, telefone ou email"
              aria-label="Pesquisar leads"
              className="pl-9"
            />
          </div>
          <Select
            valor={filtros.estado}
            aoMudar={(valor) => {
              setFiltros((f) => ({ ...f, estado: valor as FiltrosLeads['estado'] }))
              setPagina(0)
            }}
            opcoes={OPCOES_ESTADO}
          />
          <Select
            valor={filtros.origem}
            aoMudar={(valor) => {
              setFiltros((f) => ({ ...f, origem: valor as FiltrosLeads['origem'] }))
              setPagina(0)
            }}
            opcoes={OPCOES_ORIGEM}
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={filtros.de}
              aria-label="Data inicial"
              onChange={(evento) => {
                setFiltros((f) => ({ ...f, de: evento.target.value }))
                setPagina(0)
              }}
            />
            <Input
              type="date"
              value={filtros.ate}
              aria-label="Data final"
              onChange={(evento) => {
                setFiltros((f) => ({ ...f, ate: evento.target.value }))
                setPagina(0)
              }}
            />
          </div>
        </div>

        {erro ? <EstadoErro mensagem={erro} aoRepetir={() => void recarregar()} /> : null}

        {aCarregar ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((indice) => (
              <Esqueleto key={indice} className="h-24 w-full md:h-12" />
            ))}
          </div>
        ) : null}

        {!aCarregar && locais.length === 0 && !erro ? (
          <EstadoVazio
            titulo="Sem pedidos com estes filtros."
            descricao="Altere os filtros ou aguarde novos pedidos do site."
          />
        ) : null}

        {!aCarregar && locais.length > 0 ? (
          <>
            {/* Telemóvel: cartões empilhados. Nunca scroll horizontal no terreno. */}
            <ul className="space-y-3 md:hidden">
              {locais.map((lead) => (
                <li key={`${lead.tabela}-${lead.id}`}>
                  <button
                    type="button"
                    onClick={() => setAberta(lead)}
                    className="w-full border border-alc-line bg-white p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-alc-black">{lead.nome}</p>
                        <p className="text-sm text-alc-ink">{formatarDataHora(lead.criado_em)}</p>
                      </div>
                      <Badge tom={lead.estado === 'novo' ? 'escuro' : 'neutro'}>
                        {ROTULO_ESTADO_LEAD[lead.estado]}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                      <div className="col-span-2 flex gap-2">
                        <dt className="text-alc-ink">Telefone</dt>
                        <dd>{formatarTelefone(lead.telefone)}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-alc-ink">Local</dt>
                        <dd className="truncate">{lead.localidade}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-alc-ink">Área</dt>
                        <dd>{formatarArea(lead.area_m2)}</dd>
                      </div>
                    </dl>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-hidden border border-alc-line bg-white md:block">
              <table className="w-full text-sm">
                <thead className="bg-alc-grey text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Data</th>
                    <th scope="col" className="px-3 py-2 font-medium">Nome</th>
                    <th scope="col" className="px-3 py-2 font-medium">Telefone</th>
                    <th scope="col" className="px-3 py-2 font-medium">Localidade</th>
                    <th scope="col" className="px-3 py-2 font-medium">Intervenção</th>
                    <th scope="col" className="px-3 py-2 font-medium">Área</th>
                    <th scope="col" className="px-3 py-2 font-medium">Origem</th>
                    <th scope="col" className="px-3 py-2 font-medium">Estimativa</th>
                    <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-alc-line">
                  {locais.map((lead) => (
                    <tr
                      key={`${lead.tabela}-${lead.id}`}
                      onClick={() => setAberta(lead)}
                      className="cursor-pointer hover:bg-alc-rose-light/40"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">{formatarDataHora(lead.criado_em)}</td>
                      <td className="px-3 py-2">{lead.nome}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatarTelefone(lead.telefone)}</td>
                      <td className="px-3 py-2">{lead.localidade}</td>
                      <td className="px-3 py-2">
                        {lead.tipo_intervencao ? ROTULO_INTERVENCAO[lead.tipo_intervencao] : '—'}
                      </td>
                      <td className="px-3 py-2">{formatarArea(lead.area_m2)}</td>
                      <td className="px-3 py-2">{lead.origem === 'calculadora' ? 'Calculadora' : 'Formulário'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {lead.valor_estimado_cents ? formatarEuros(lead.valor_estimado_cents) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tom={lead.estado === 'novo' ? 'escuro' : 'neutro'}>
                          {ROTULO_ESTADO_LEAD[lead.estado]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                variante="secundario"
                tamanho="sm"
                disabled={pagina === 0}
                onClick={() => setPagina((atual) => Math.max(0, atual - 1))}
              >
                Anterior
              </Button>
              <p className="text-sm text-alc-ink">
                Página {pagina + 1} de {paginas}
              </p>
              <Button
                variante="secundario"
                tamanho="sm"
                disabled={pagina + 1 >= paginas}
                onClick={() => setPagina((atual) => atual + 1)}
              >
                Seguinte
              </Button>
            </div>
          </>
        ) : null}
      </div>

      <PainelLead
        lead={selecionada}
        aoFechar={() => setAberta(null)}
        aoMudarEstado={mudarEstadoLocal}
        aoAtualizar={atualizarLeadLocal}
        aoPedirApagar={setApagarAlvo}
      />

      <ConfirmarDialog
        aberto={apagarAlvo !== null}
        aoMudar={(aberto) => {
          if (!aberto) setApagarAlvo(null)
        }}
        titulo="Apagar pedido"
        descricao={
          apagarAlvo
            ? `O pedido de "${apagarAlvo.nome}" vai ser apagado, com as suas fotografias e notas. Esta ação não pode ser desfeita.`
            : ''
        }
        ocupado={aApagar}
        aoConfirmar={() => void apagar()}
      />
    </>
  )
}
