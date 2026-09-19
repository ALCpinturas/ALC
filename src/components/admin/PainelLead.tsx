import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { atualizarEstadoLead, guardarNotasLead } from '@/lib/hooks/useLeads'
import { formatarArea, formatarDataHora, formatarEuros, formatarTelefone } from '@/lib/format'
import { ESTADOS_LEAD, ROTULO_ESTADO_LEAD, ROTULO_INTERVENCAO } from '@/lib/schemas/comum'
import { ROTULO_TRABALHO } from '@/lib/schemas/calculadora'
import { mensagemErro, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { EstadoLead, LeadUnificada } from '@/types/database'

interface PainelLeadProps {
  lead: LeadUnificada | null
  aoFechar: () => void
  aoMudarEstado: (id: string, estado: EstadoLead) => void
}

export default function PainelLead({ lead, aoFechar, aoMudarEstado }: PainelLeadProps) {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const [notas, setNotas] = useState('')
  const [aGuardar, setAGuardar] = useState(false)
  const [aConverter, setAConverter] = useState(false)
  const [fotografias, setFotografias] = useState<string[]>([])

  useEffect(() => {
    setNotas(lead?.notas_internas ?? '')
  }, [lead])

  useEffect(() => {
    if (!lead?.fotografias?.length) {
      setFotografias([])
      return
    }
    let ativo = true
    void supabase.storage
      .from('pedidos-fotografias')
      .createSignedUrls(lead.fotografias, 3600)
      .then(({ data }) => {
        if (!ativo) return
        setFotografias((data ?? []).flatMap((item) => (item.signedUrl ? [item.signedUrl] : [])))
      })
    return () => {
      ativo = false
    }
  }, [lead])

  async function mudarEstado(novo: string) {
    if (!lead) return
    const anterior = lead.estado
    aoMudarEstado(lead.id, novo as EstadoLead)
    const erro = await atualizarEstadoLead(lead, novo as EstadoLead)
    if (erro) {
      aoMudarEstado(lead.id, anterior)
      toast.error(`Não foi possível mudar o estado. ${erro}`)
    }
  }

  async function guardarNota() {
    if (!lead || notas.trim() === (lead.notas_internas ?? '').trim()) return
    setAGuardar(true)
    const assinatura = `— ${perfil?.nome ?? 'ALC'}, ${formatarDataHora(new Date())}`
    const texto = notas.trim() ? `${notas.trim()}\n${assinatura}` : ''
    const erro = await guardarNotasLead(lead, texto)
    setAGuardar(false)
    if (erro) {
      toast.error(`Não foi possível guardar as notas. ${erro}`)
      return
    }
    setNotas(texto)
    toast.success('Notas guardadas.')
  }

  async function converterEmCliente() {
    if (!lead) return
    if (lead.cliente_id) {
      void navegar(`/admin/clientes/${lead.cliente_id}`)
      return
    }
    setAConverter(true)
    const { data, error } = await supabase.rpc('converter_lead_em_cliente', {
      p_lead_id: lead.id,
      p_lead_tabela: lead.tabela,
    })
    setAConverter(false)
    if (error || !data) {
      toast.error(`Não foi possível converter em cliente. ${mensagemErro(error)}`)
      return
    }
    void navegar(`/admin/clientes/${data}`)
  }

  return (
    <Dialog
      aberto={lead !== null}
      aoMudar={(aberto) => {
        if (!aberto) aoFechar()
      }}
      titulo={lead?.nome ?? ''}
      descricao={lead ? formatarDataHora(lead.criado_em) : undefined}
      largura="md"
      rodape={
        lead ? (
          <>
            <Button variante="secundario" onClick={aoFechar}>
              Fechar
            </Button>
            <Button ocupado={aConverter} onClick={() => void converterEmCliente()}>
              {lead.cliente_id ? 'Ver cliente' : 'Converter em cliente'}
            </Button>
          </>
        ) : null
      }
    >
      {lead ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge tom="rosa">{lead.origem === 'calculadora' ? 'Calculadora' : 'Formulário'}</Badge>
            <Badge tom="neutro">{ROTULO_ESTADO_LEAD[lead.estado]}</Badge>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-alc-ink">Telefone</dt>
              <dd>
                <a href={`tel:${lead.telefone}`} className="text-alc-rose-deep underline underline-offset-4">
                  {formatarTelefone(lead.telefone)}
                </a>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-alc-ink">Email</dt>
              <dd className="truncate">
                <a href={`mailto:${lead.email}`} className="text-alc-rose-deep underline underline-offset-4">
                  {lead.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-alc-ink">Localidade</dt>
              <dd>{lead.localidade}</dd>
            </div>
            <div>
              <dt className="text-alc-ink">Área</dt>
              <dd>{formatarArea(lead.area_m2)}</dd>
            </div>
            {lead.tipo_intervencao ? (
              <div>
                <dt className="text-alc-ink">Intervenção</dt>
                <dd>{ROTULO_INTERVENCAO[lead.tipo_intervencao]}</dd>
              </div>
            ) : null}
            {lead.valor_max_cents ? (
              <div>
                <dt className="text-alc-ink">Estimativa</dt>
                <dd>
                  {formatarEuros(lead.valor_min_cents ?? 0)} a {formatarEuros(lead.valor_max_cents)}
                </dd>
              </div>
            ) : null}
          </dl>

          {lead.trabalhos?.length ? (
            <div>
              <p className="text-sm text-alc-ink">Trabalhos pedidos</p>
              <p className="mt-1 text-sm">
                {lead.trabalhos
                  .map((chave) => ROTULO_TRABALHO[chave as keyof typeof ROTULO_TRABALHO] ?? chave)
                  .join(', ')}
              </p>
            </div>
          ) : null}

          {lead.mensagem ? (
            <div>
              <p className="text-sm text-alc-ink">Mensagem</p>
              <p className="mt-1 whitespace-pre-line text-sm">{lead.mensagem}</p>
            </div>
          ) : null}

          {fotografias.length > 0 ? (
            <div>
              <p className="text-sm text-alc-ink">Fotografias</p>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {fotografias.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="Fotografia enviada pelo cliente" className="aspect-square w-full object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-sm text-alc-ink">Estado</p>
            <Select
              valor={lead.estado}
              aoMudar={(valor) => void mudarEstado(valor)}
              opcoes={ESTADOS_LEAD.map((estado) => ({
                valor: estado,
                rotulo: ROTULO_ESTADO_LEAD[estado],
              }))}
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-alc-ink">Notas internas</p>
            <Textarea
              rows={4}
              value={notas}
              onChange={(evento) => setNotas(evento.target.value)}
              placeholder="Registo do contacto, o que ficou combinado…"
            />
            <Button
              variante="secundario"
              className="mt-2"
              ocupado={aGuardar}
              onClick={() => void guardarNota()}
            >
              Guardar notas
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  )
}
