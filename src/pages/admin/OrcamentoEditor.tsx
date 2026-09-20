import * as TabsPrimitive from '@radix-ui/react-tabs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Building2, Copy, FileDown, Mail, MessageCircle, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { EstadoErro, Esqueleto } from '@/components/ui/Estados'
import Cabecalho from '@/components/admin/Cabecalho'
import EditorLinhas from '@/components/admin/EditorLinhas'
import EditorMedicoes from '@/components/admin/EditorMedicoes'
import GerarLinhas from '@/components/admin/GerarLinhas'
import { TAXAS_IVA, totais } from '@/lib/calculo/orcamento'
import { centimosParaInput, formatarEuros, parseEurosParaCentimos, primeiroNome } from '@/lib/format'
import { useOrcamento } from '@/lib/hooks/useOrcamento'
import { criarNovaVersaoOrcamento } from '@/lib/hooks/useOrcamentos'
import {
  ROTULO_ESTADO_ORCAMENTO,
  ROTULO_INTERVENCAO,
  TIPOS_INTERVENCAO,
} from '@/lib/schemas/comum'
import { mensagemErro, mensagemErroFuncao, supabase } from '@/lib/supabase'
import { useSeo } from '@/lib/useSeo'
import { cn } from '@/lib/cn'
import type { ObraRow, TipoIntervencao } from '@/types/database'

const SEPARADORES = [
  { valor: 'medicoes', rotulo: 'Medições' },
  { valor: 'linhas', rotulo: 'Linhas' },
  { valor: 'condicoes', rotulo: 'Condições' },
]

export default function OrcamentoEditor() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const { orcamento, obra, cliente, linhas, medicoes, precos, aCarregar, erro, recarregar } =
    useOrcamento(id)

  const [desconto, setDesconto] = useState('0,00')
  const [taxa, setTaxa] = useState('23')
  const [validade, setValidade] = useState('30')
  const [condicoes, setCondicoes] = useState('')
  const [notas, setNotas] = useState('')
  const [gerar, setGerar] = useState(false)
  const [aGuardar, setAGuardar] = useState(false)
  const [aPreVisualizar, setAPreVisualizar] = useState(false)
  const [aEmitir, setAEmitir] = useState(false)
  const [aVersionar, setAVersionar] = useState(false)
  const [aceitar, setAceitar] = useState(false)
  const [associar, setAssociar] = useState(false)
  const [recusar, setRecusar] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [tituloObra, setTituloObra] = useState('')
  const [tiposObra, setTiposObra] = useState<string[]>([])
  const [obrasDoCliente, setObrasDoCliente] = useState<ObraRow[]>([])
  const [aCriarObra, setACriarObra] = useState(false)

  useSeo({
    titulo: orcamento ? `Orçamento ${orcamento.numero} — ALC` : 'Orçamento — ALC',
    descricao: 'Editor de orçamento.',
    naoIndexar: true,
  })

  // Obras do cliente, para poder associar a proposta a uma que já exista.
  useEffect(() => {
    if (!(aceitar || associar) || !orcamento) return
    void supabase
      .from('obras')
      .select('*')
      .eq('cliente_id', orcamento.cliente_id)
      .order('criado_em', { ascending: false })
      .then(({ data }) => setObrasDoCliente(data ?? []))
  }, [aceitar, associar, orcamento])

  useEffect(() => {
    if (!cliente || tituloObra) return
    setTituloObra(
      cliente.localidade ? `${cliente.nome} — ${cliente.localidade}` : `Obra de ${cliente.nome}`,
    )
  }, [cliente, tituloObra])

  useEffect(() => {
    if (!orcamento) return
    setDesconto(centimosParaInput(orcamento.desconto_cents))
    setTaxa(String(orcamento.iva_taxa))
    setValidade(String(orcamento.validade_dias))
    setCondicoes(orcamento.condicoes ?? '')
    setNotas(orcamento.notas ?? '')
  }, [orcamento])

  const bloqueado = orcamento ? orcamento.estado !== 'rascunho' : true

  const calculo = useMemo(
    () =>
      totais(
        linhas.map((linha) => ({
          quantidade: linha.quantidade,
          preco_unitario_cents: linha.preco_unitario_cents,
        })),
        parseEurosParaCentimos(desconto) ?? 0,
        Number(taxa),
      ),
    [desconto, linhas, taxa],
  )

  async function guardarTotais() {
    if (!orcamento) return
    setAGuardar(true)
    const { error } = await supabase
      .from('orcamentos')
      .update({
        subtotal_cents: calculo.subtotal_cents,
        desconto_cents: calculo.desconto_cents,
        iva_taxa: Number(taxa),
        iva_cents: calculo.iva_cents,
        total_cents: calculo.total_cents,
        validade_dias: Number(validade) || 30,
        condicoes,
        notas: notas || null,
      })
      .eq('id', orcamento.id)
    setAGuardar(false)
    if (error) {
      toast.error(`Não foi possível guardar. ${mensagemErro(error)}`)
      return
    }
    toast.success('Orçamento guardado.')
    void recarregar()
  }

  async function preVisualizar() {
    if (!orcamento || !cliente) return
    setAPreVisualizar(true)
    try {
      const { gerarPdfOrcamento } = await import('@/lib/pdf/orcamento')
      const pdf = await gerarPdfOrcamento({
        orcamento: { ...orcamento, ...calculo, iva_taxa: Number(taxa), condicoes, notas },
        cliente,
        obra,
        linhas,
      })
      window.open(URL.createObjectURL(pdf), '_blank', 'noopener')
    } catch (erroPreVisualizacao) {
      toast.error(`Não foi possível gerar a pré-visualização. ${mensagemErro(erroPreVisualizacao)}`)
    } finally {
      setAPreVisualizar(false)
    }
  }

  async function emitir() {
    if (!orcamento || !cliente) return
    if (linhas.length === 0) {
      toast.error('Não é possível emitir um orçamento sem linhas.')
      return
    }

    setAEmitir(true)
    try {
      const { gerarPdfOrcamento } = await import('@/lib/pdf/orcamento')
      const emissao = new Date().toISOString().slice(0, 10)
      const pdf = await gerarPdfOrcamento({
        orcamento: {
          ...orcamento,
          ...calculo,
          iva_taxa: Number(taxa),
          condicoes,
          notas,
          data_emissao: emissao,
        },
        cliente,
        obra,
        linhas,
      })

      // O caminho segue o cliente, não a obra: a obra pode ainda não existir.
      const caminho = `${orcamento.cliente_id}/${orcamento.id}/${orcamento.versao}.pdf`
      const { error: erroUpload } = await supabase.storage
        .from('orcamentos')
        .upload(caminho, pdf, { contentType: 'application/pdf', upsert: true })
      if (erroUpload) throw erroUpload

      const { error } = await supabase
        .from('orcamentos')
        .update({
          estado: 'enviado',
          data_emissao: emissao,
          pdf_path: caminho,
          subtotal_cents: calculo.subtotal_cents,
          desconto_cents: calculo.desconto_cents,
          iva_taxa: Number(taxa),
          iva_cents: calculo.iva_cents,
          total_cents: calculo.total_cents,
          condicoes,
          notas: notas || null,
        })
        .eq('id', orcamento.id)
      if (error) throw error

      toast.success('Orçamento emitido. A edição fica bloqueada nesta versão.')
      void recarregar()
    } catch (erroEmissao) {
      toast.error(`Não foi possível emitir. ${mensagemErro(erroEmissao)}`)
    } finally {
      setAEmitir(false)
    }
  }

  /** Uma versão enviada, aceite, recusada ou expirada não se altera: cria-se uma nova. */
  async function criarNovaVersao() {
    if (!orcamento) return
    setAVersionar(true)
    const resultado = await criarNovaVersaoOrcamento(orcamento.id)
    setAVersionar(false)
    if ('erro' in resultado) {
      toast.error(`Não foi possível criar uma nova versão. ${resultado.erro}`)
      return
    }
    toast.success(`Versão ${orcamento.versao + 1} criada em rascunho.`)
    void navegar(`/admin/orcamentos/${resultado.id}`)
  }

  async function enviarAoCliente() {
    if (!orcamento || !cliente?.email) return
    const { error } = await supabase.functions.invoke('enviar-orcamento', {
      body: { orcamento_id: orcamento.id },
    })
    if (error) {
      toast.error(`Não foi possível enviar. ${await mensagemErroFuncao(error)}`)
      return
    }
    toast.success(`Orçamento enviado para ${cliente.email}.`)
  }

  async function enviarPorWhatsapp() {
    if (!orcamento || !cliente?.telefone) return
    const { data, error } = await supabase.functions.invoke<{ ok: boolean; url?: string }>(
      'enviar-orcamento',
      { body: { orcamento_id: orcamento.id, canal: 'whatsapp' } },
    )
    if (error) {
      toast.error(`Não foi possível preparar o WhatsApp. ${await mensagemErroFuncao(error)}`)
      return
    }
    if (!data?.url) {
      toast.error('Não foi possível preparar o WhatsApp.')
      return
    }

    const digitos = cliente.telefone.replace(/\D/g, '').replace(/^351/, '')
    const mensagem = `Olá ${primeiroNome(cliente.nome)}, aqui está o orçamento ALC ${orcamento.numero}: ${data.url}`
    window.open(
      `https://wa.me/351${digitos}?text=${encodeURIComponent(mensagem)}`,
      '_blank',
      'noopener',
    )
  }

  async function marcarAceite(adjudicar: boolean): Promise<boolean> {
    if (!orcamento) return false
    const { error } = await supabase.rpc('aceitar_orcamento', {
      p_orcamento_id: orcamento.id,
      p_adjudicar: adjudicar,
    })
    if (error) {
      toast.error(`Não foi possível marcar como aceite. ${mensagemErro(error)}`)
      return false
    }
    return true
  }

  async function aceitarSemObra() {
    if (!(await marcarAceite(false))) return
    setAceitar(false)
    toast.success('Orçamento aceite. Pode associar uma obra quando quiser.')
    void recarregar()
  }

  async function aceitarEAdjudicar() {
    if (!(await marcarAceite(true))) return
    setAceitar(false)
    toast.success('Orçamento aceite e obra adjudicada.')
    void recarregar()
  }

  /** Aceita e cria a obra a partir da proposta, com o valor adjudicado já preenchido. */
  async function aceitarECriarObra() {
    if (!orcamento || !cliente) return
    if (tiposObra.length === 0) {
      toast.error('Escolha pelo menos um tipo de trabalho para a obra.')
      return
    }

    setACriarObra(true)
    const aceite = await marcarAceite(false)
    if (!aceite) {
      setACriarObra(false)
      return
    }

    const { data, error } = await supabase.rpc('criar_obra_de_orcamento', {
      p_orcamento_id: orcamento.id,
      p_titulo: tituloObra.trim() || `Obra de ${cliente.nome}`,
      p_tipos_intervencao: tiposObra as TipoIntervencao[],
      p_morada: cliente.morada,
      p_localidade: cliente.localidade,
    })
    setACriarObra(false)

    if (error || !data) {
      toast.error(`O orçamento ficou aceite, mas a obra não foi criada. ${mensagemErro(error)}`)
      void recarregar()
      return
    }
    setAceitar(false)
    toast.success('Obra criada e adjudicada a partir do orçamento.')
    void navegar(`/admin/obras/${data}`)
  }

  async function associarAObra(obraId: string) {
    if (!orcamento) return
    const { error } = await supabase.rpc('associar_orcamento_a_obra', {
      p_orcamento_id: orcamento.id,
      p_obra_id: obraId,
    })
    if (error) {
      toast.error(`Não foi possível associar. ${mensagemErro(error)}`)
      return
    }
    setAceitar(false)
    setAssociar(false)
    toast.success('Orçamento associado à obra.')
    void recarregar()
  }

  async function confirmarRecusa() {
    if (!orcamento) return
    if (motivo.trim().length < 3) {
      toast.error('Indique o motivo da recusa.')
      return
    }
    const { error } = await supabase
      .from('orcamentos')
      .update({
        estado: 'recusado',
        notas: `${orcamento.notas ? `${orcamento.notas}\n` : ''}Recusado: ${motivo.trim()}`,
      })
      .eq('id', orcamento.id)
    setRecusar(false)
    setMotivo('')
    if (error) {
      toast.error(`Não foi possível registar a recusa. ${mensagemErro(error)}`)
      return
    }
    void recarregar()
  }

  if (aCarregar) {
    return (
      <div className="space-y-3 p-4 md:p-6">
        <Esqueleto className="h-8 w-56" />
        <Esqueleto className="h-64 w-full" />
      </div>
    )
  }

  if (erro || !orcamento) {
    return <EstadoErro className="m-4" mensagem={erro ?? 'Orçamento não encontrado.'} />
  }

  return (
    <>
      <Cabecalho
        titulo={`Orçamento ${orcamento.numero}`}
        subtitulo={`Versão ${orcamento.versao} · ${cliente?.nome ?? 'Sem cliente'}${
          obra ? ` · obra ${obra.numero}` : ' · sem obra associada'
        }`}
        voltarPara={obra ? `/admin/obras/${obra.id}` : '/admin/orcamentos'}
        acoes={<Badge tom="escuro">{ROTULO_ESTADO_ORCAMENTO[orcamento.estado]}</Badge>}
      />

      {bloqueado ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-alc-line bg-alc-grey px-4 py-3 md:px-6">
          <p className="text-sm text-alc-ink">
            Esta versão já foi {ROTULO_ESTADO_ORCAMENTO[orcamento.estado].toLowerCase()} e não
            pode ser alterada. Para editar, crie uma nova versão.
          </p>
          <Button
            variante="secundario"
            tamanho="sm"
            ocupado={aVersionar}
            onClick={() => void criarNovaVersao()}
          >
            <Copy aria-hidden className="size-4" />
            Criar nova versão para editar
          </Button>
        </div>
      ) : null}

      <TabsPrimitive.Root defaultValue="linhas">
        <TabsPrimitive.List
          aria-label="Separadores do orçamento"
          className="flex overflow-x-auto border-b border-alc-line bg-white px-2"
        >
          {SEPARADORES.map((separador) => (
            <TabsPrimitive.Trigger
              key={separador.valor}
              value={separador.valor}
              className={cn(
                'toque shrink-0 border-b-2 border-transparent px-4 text-sm text-alc-ink',
                'data-[state=active]:border-alc-rose-dark data-[state=active]:text-alc-black',
              )}
            >
              {separador.rotulo}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>

        <div className="p-4 pb-44 md:p-6 md:pb-32">
          <TabsPrimitive.Content value="medicoes">
            <EditorMedicoes
              orcamentoId={orcamento.id}
              medicoes={medicoes}
              bloqueado={bloqueado}
              aoMudar={() => void recarregar()}
            />
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="linhas">
            <div className="space-y-4">
              {!bloqueado && medicoes.length > 0 ? (
                <Button variante="secundario" onClick={() => setGerar(true)}>
                  <Sparkles aria-hidden className="size-4" />
                  Gerar linhas a partir das medições
                </Button>
              ) : null}
              <EditorLinhas
                orcamentoId={orcamento.id}
                linhas={linhas}
                bloqueado={bloqueado}
                aoMudar={() => void recarregar()}
              />
            </div>
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="condicoes">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Desconto">
                  <Input
                    inputMode="decimal"
                    disabled={bloqueado}
                    value={desconto}
                    onChange={(evento) => setDesconto(evento.target.value)}
                  />
                </Campo>
                <Campo
                  etiqueta="Taxa de IVA"
                  ajuda="A taxa aplicável depende do enquadramento da obra, confirme antes de emitir."
                >
                  <Select
                    valor={taxa}
                    desativado={bloqueado}
                    aoMudar={setTaxa}
                    opcoes={TAXAS_IVA.map((valor) => ({
                      valor: String(valor),
                      rotulo: `${valor}%`,
                    }))}
                  />
                </Campo>
                <Campo etiqueta="Validade (dias)">
                  <Input
                    inputMode="numeric"
                    disabled={bloqueado}
                    value={validade}
                    onChange={(evento) => setValidade(evento.target.value)}
                  />
                </Campo>
              </div>
              <Campo etiqueta="Condições">
                <Textarea
                  rows={6}
                  disabled={bloqueado}
                  value={condicoes}
                  onChange={(evento) => setCondicoes(evento.target.value)}
                />
              </Campo>
              <Campo etiqueta="Notas internas">
                <Textarea
                  rows={3}
                  disabled={bloqueado}
                  value={notas}
                  onChange={(evento) => setNotas(evento.target.value)}
                />
              </Campo>
            </div>
          </TabsPrimitive.Content>
        </div>
      </TabsPrimitive.Root>

      {/* Totais sempre à vista, acima da navegação inferior no telemóvel. */}
      <div className="safe-b fixed inset-x-0 bottom-14 z-20 border-t border-alc-line bg-white px-4 py-3 md:bottom-0 md:px-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <div className="flex gap-1">
              <dt className="text-alc-ink">Subtotal</dt>
              <dd>{formatarEuros(calculo.subtotal_cents)}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-alc-ink">IVA {taxa}%</dt>
              <dd>{formatarEuros(calculo.iva_cents)}</dd>
            </div>
            <div className="flex gap-1 font-medium">
              <dt>Total</dt>
              <dd>{formatarEuros(calculo.total_cents)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button
              variante="fantasma"
              tamanho="sm"
              ocupado={aPreVisualizar}
              onClick={() => void preVisualizar()}
            >
              <FileDown aria-hidden className="size-4" />
              Pré-visualizar
            </Button>

            {orcamento.estado === 'rascunho' ? (
              <>
                <Button variante="secundario" tamanho="sm" ocupado={aGuardar} onClick={() => void guardarTotais()}>
                  Guardar
                </Button>
                <Button tamanho="sm" ocupado={aEmitir} onClick={() => void emitir()}>
                  <Send aria-hidden className="size-4" />
                  Emitir
                </Button>
              </>
            ) : null}

            {orcamento.estado === 'enviado' ? (
              <>
                {cliente?.email ? (
                  <Button variante="secundario" tamanho="sm" onClick={() => void enviarAoCliente()}>
                    <Mail aria-hidden className="size-4" />
                    Enviar ao cliente
                  </Button>
                ) : null}
                {cliente?.telefone ? (
                  <Button variante="secundario" tamanho="sm" onClick={() => void enviarPorWhatsapp()}>
                    <MessageCircle aria-hidden className="size-4" />
                    WhatsApp
                  </Button>
                ) : null}
                <Button tamanho="sm" onClick={() => setAceitar(true)}>
                  Aceite
                </Button>
                <Button variante="perigo" tamanho="sm" onClick={() => setRecusar(true)}>
                  Recusado
                </Button>
              </>
            ) : null}

            {orcamento.estado === 'aceite' && !obra ? (
              <Button variante="secundario" tamanho="sm" onClick={() => setAssociar(true)}>
                <Building2 aria-hidden className="size-4" />
                Associar obra
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <GerarLinhas
        aberto={gerar}
        aoFechar={() => setGerar(false)}
        orcamentoId={orcamento.id}
        medicoes={medicoes}
        precos={precos}
        ordemInicial={linhas.length}
        aoGerar={() => void recarregar()}
      />

      <Dialog
        aberto={aceitar}
        aoMudar={setAceitar}
        titulo="Proposta aceite"
        descricao={
          obra
            ? 'Quer adjudicar a obra associada com este valor?'
            : 'O que fazer com a obra? Pode criar uma agora ou deixar para depois.'
        }
      >
        {obra ? (
          <div className="space-y-4">
            <p className="text-sm text-alc-ink">
              A obra {obra.numero} passa a adjudicada, com valor{' '}
              {formatarEuros(orcamento.total_cents)}. As duas alterações são feitas numa só
              transação.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void aceitarEAdjudicar()}>Aceitar e adjudicar</Button>
              <Button variante="secundario" onClick={() => void aceitarSemObra()}>
                Só marcar como aceite
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="font-display text-lg text-alc-black">Criar obra a partir daqui</h3>
              <p className="text-sm text-alc-ink">
                Fica adjudicada com o valor de {formatarEuros(orcamento.total_cents)} e ligada a
                esta proposta.
              </p>
              <Campo etiqueta="Título da obra">
                <Input value={tituloObra} onChange={(e) => setTituloObra(e.target.value)} />
              </Campo>
              <div>
                <p className="mb-2 text-sm font-medium text-alc-black">Tipos de trabalho</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TIPOS_INTERVENCAO.map((tipo) => {
                    const escolhido = tiposObra.includes(tipo)
                    return (
                      <button
                        key={tipo}
                        type="button"
                        aria-pressed={escolhido}
                        onClick={() =>
                          setTiposObra((atuais) =>
                            atuais.includes(tipo)
                              ? atuais.filter((t) => t !== tipo)
                              : [...atuais, tipo],
                          )
                        }
                        className={cn(
                          'toque rounded-[2px] border px-3 text-left text-sm',
                          escolhido ? 'border-alc-rose-dark bg-alc-rose-light' : 'border-alc-line',
                        )}
                      >
                        {ROTULO_INTERVENCAO[tipo]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Button ocupado={aCriarObra} onClick={() => void aceitarECriarObra()}>
                Aceitar e criar obra
              </Button>
            </section>

            {obrasDoCliente.length > 0 ? (
              <section className="space-y-3 border-t border-alc-line pt-4">
                <h3 className="font-display text-lg text-alc-black">Ou associar a obra existente</h3>
                <ul className="space-y-2">
                  {obrasDoCliente.map((existente) => (
                    <li key={existente.id}>
                      <button
                        type="button"
                        onClick={() => void associarAObra(existente.id)}
                        className="toque w-full border border-alc-line px-3 text-left text-sm hover:border-alc-rose-dark"
                      >
                        {existente.numero} · {existente.titulo}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="border-t border-alc-line pt-4">
              <Button variante="secundario" onClick={() => void aceitarSemObra()}>
                Só marcar como aceite, decido depois
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        aberto={associar}
        aoMudar={setAssociar}
        titulo="Associar a uma obra"
        descricao="Só aparecem obras do mesmo cliente."
      >
        {obrasDoCliente.length === 0 ? (
          <p className="text-sm text-alc-ink">Este cliente ainda não tem obras.</p>
        ) : (
          <ul className="space-y-2">
            {obrasDoCliente.map((existente) => (
              <li key={existente.id}>
                <button
                  type="button"
                  onClick={() => void associarAObra(existente.id)}
                  className="toque w-full border border-alc-line px-3 text-left text-sm hover:border-alc-rose-dark"
                >
                  {existente.numero} · {existente.titulo}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      <Dialog
        aberto={recusar}
        aoMudar={setRecusar}
        titulo="Marcar como recusado"
        largura="sm"
        rodape={
          <>
            <Button variante="secundario" onClick={() => setRecusar(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmarRecusa()}>Registar recusa</Button>
          </>
        }
      >
        <Campo etiqueta="Motivo" obrigatorio>
          <Textarea rows={3} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} />
        </Campo>
      </Dialog>
    </>
  )
}
