import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmarDialog from '@/components/ui/ConfirmarDialog'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import Cabecalho from '@/components/admin/Cabecalho'
import {
  criarOrcamento,
  FILTROS_ORCAMENTOS_INICIAIS,
  useOrcamentos,
  type FiltrosOrcamentos,
  type OrcamentoComRelacoes,
} from '@/lib/hooks/useOrcamentos'
import { formatarData, formatarEuros } from '@/lib/format'
import { ESTADOS_ORCAMENTO, ROTULO_ESTADO_ORCAMENTO } from '@/lib/schemas/comum'
import { mensagemErro, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useSeo } from '@/lib/useSeo'
import { cn } from '@/lib/cn'

export default function Orcamentos() {
  useSeo({ titulo: 'Orçamentos — ALC', descricao: 'Propostas.', naoIndexar: true })

  const { perfil } = useAuth()
  const navegar = useNavigate()
  const [filtros, setFiltros] = useState<FiltrosOrcamentos>(FILTROS_ORCAMENTOS_INICIAIS)
  const { orcamentos, aCarregar, erro, recarregar } = useOrcamentos(filtros)

  const [novoAberto, setNovoAberto] = useState(false)
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [pesquisa, setPesquisa] = useState('')
  const [aCriar, setACriar] = useState(false)
  const [pesquisaLista, setPesquisaLista] = useState('')
  const [apagarAlvo, setApagarAlvo] = useState<OrcamentoComRelacoes | null>(null)
  const [aApagar, setAApagar] = useState(false)

  useEffect(() => {
    if (!novoAberto) return
    void supabase
      .from('clientes')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setClientes(data ?? []))
  }, [novoAberto])

  async function criar(clienteId: string) {
    setACriar(true)
    const resultado = await criarOrcamento(clienteId, perfil?.id ?? null)
    setACriar(false)
    if ('erro' in resultado) {
      toast.error(`Não foi possível criar o orçamento. ${resultado.erro}`)
      return
    }
    setNovoAberto(false)
    void navegar(`/admin/orcamentos/${resultado.id}`)
  }

  async function apagar() {
    if (!apagarAlvo) return
    setAApagar(true)
    const { error } = await supabase.from('orcamentos').delete().eq('id', apagarAlvo.id)
    setAApagar(false)
    if (error) {
      toast.error(`Não foi possível apagar o orçamento. ${mensagemErro(error)}`)
      return
    }
    setApagarAlvo(null)
    toast.success('Orçamento apagado.')
    void recarregar()
  }

  const visiveis = clientes.filter((c) =>
    c.nome.toLowerCase().includes(pesquisa.trim().toLowerCase()),
  )

  const porEstado = (estado: string) => orcamentos.filter((o) => o.estado === estado).length

  const termo = pesquisaLista.trim().toLowerCase()
  const orcamentosFiltrados = termo
    ? orcamentos.filter(
        (o) =>
          o.numero.toLowerCase().includes(termo) ||
          (o.cliente?.nome.toLowerCase().includes(termo) ?? false),
      )
    : orcamentos

  return (
    <>
      <Cabecalho
        titulo="Orçamentos"
        subtitulo={`${orcamentos.length} ${orcamentos.length === 1 ? 'proposta' : 'propostas'}`}
        acoes={
          <Button tamanho="sm" onClick={() => setNovoAberto(true)}>
            <Plus aria-hidden className="size-4" />
            Novo orçamento
          </Button>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-alc-ink"
          />
          <Input
            value={pesquisaLista}
            onChange={(e) => setPesquisaLista(e.target.value)}
            placeholder="Procurar por cliente ou número de orçamento"
            aria-label="Procurar orçamento por cliente ou número"
            className="pl-9"
          />
        </div>

        {/* Filtro rápido por estado: é assim que se procura uma proposta no dia a dia. */}
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div role="tablist" aria-label="Filtrar por estado" className="flex gap-2">
            {[{ valor: 'todos', rotulo: 'Todos' }, ...ESTADOS_ORCAMENTO.map((e) => ({
              valor: e,
              rotulo: ROTULO_ESTADO_ORCAMENTO[e],
            }))].map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                role="tab"
                aria-selected={filtros.estado === opcao.valor}
                onClick={() =>
                  setFiltros((f) => ({ ...f, estado: opcao.valor as FiltrosOrcamentos['estado'] }))
                }
                className={cn(
                  'shrink-0 rounded-[2px] border px-3 py-2 text-sm',
                  filtros.estado === opcao.valor
                    ? 'border-alc-rose-dark bg-alc-rose-dark text-white'
                    : 'border-alc-line text-alc-ink',
                )}
              >
                {opcao.rotulo}
                {opcao.valor !== 'todos' ? (
                  <span className="ml-1 opacity-70">{porEstado(opcao.valor)}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {erro ? <EstadoErro mensagem={erro} aoRepetir={() => void recarregar()} /> : null}

        {aCarregar ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Esqueleto key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : null}

        {!aCarregar && orcamentos.length > 0 && orcamentosFiltrados.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum orçamento corresponde à pesquisa."
            descricao="Tente pelo nome do cliente ou pelo número do orçamento."
          />
        ) : null}

        {!aCarregar && orcamentos.length === 0 && !erro ? (
          <EstadoVazio
            titulo="Sem orçamentos com este filtro."
            descricao="Um orçamento começa no cliente. A obra liga-se depois, se a proposta for aceite."
            acao={<Button onClick={() => setNovoAberto(true)}>Novo orçamento</Button>}
          />
        ) : null}

        {!aCarregar && orcamentosFiltrados.length > 0 ? (
          <ul className="space-y-2">
            {orcamentosFiltrados.map((orcamento) => (
              <li key={orcamento.id}>
                <div className="border border-alc-line bg-white hover:border-alc-rose-dark">
                  <Link to={`/admin/orcamentos/${orcamento.id}`} className="block p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-alc-ink">
                          {orcamento.numero} · versão {orcamento.versao}
                        </p>
                        <p className="truncate font-medium text-alc-black">
                          {orcamento.cliente?.nome ?? 'Cliente removido'}
                        </p>
                        <p className="mt-1 truncate text-sm text-alc-ink">
                          {orcamento.obra
                            ? `Obra ${orcamento.obra.numero} · ${orcamento.obra.titulo}`
                            : 'Sem obra associada'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge tom={orcamento.estado === 'aceite' ? 'escuro' : 'neutro'}>
                          {ROTULO_ESTADO_ORCAMENTO[orcamento.estado]}
                        </Badge>
                        <p className="mt-1 font-medium">{formatarEuros(orcamento.total_cents)}</p>
                        <p className="text-xs text-alc-ink">
                          {orcamento.data_emissao
                            ? formatarData(orcamento.data_emissao)
                            : 'por emitir'}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <div className="flex justify-end border-t border-alc-line p-2">
                    <button
                      type="button"
                      onClick={() => setApagarAlvo(orcamento)}
                      className="toque flex items-center gap-1.5 rounded-[2px] px-2 text-sm text-alc-rose-deep hover:bg-alc-rose-light"
                    >
                      <Trash2 aria-hidden className="size-4" />
                      Apagar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Dialog
        aberto={novoAberto}
        aoMudar={setNovoAberto}
        titulo="Novo orçamento"
        descricao="Escolha o cliente. A obra associa-se depois, se a proposta for aceite."
      >
        <div className="space-y-4">
          <Input
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Procurar cliente"
            aria-label="Procurar cliente"
          />

          {clientes.length === 0 ? (
            <EstadoVazio
              titulo="Ainda não há clientes."
              descricao="Crie o cliente primeiro, ou converta uma lead recebida pelo site."
              acao={
                <Button asChild variante="secundario">
                  <Link to="/admin/clientes">Ir para clientes</Link>
                </Button>
              }
            />
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {visiveis.map((cliente) => (
                <li key={cliente.id}>
                  <button
                    type="button"
                    disabled={aCriar}
                    onClick={() => void criar(cliente.id)}
                    className="toque w-full border border-alc-line px-4 text-left hover:border-alc-rose-dark disabled:opacity-50"
                  >
                    {cliente.nome}
                  </button>
                </li>
              ))}
              {visiveis.length === 0 ? (
                <li className="py-4 text-center text-sm text-alc-ink">
                  Nenhum cliente com esse nome.
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </Dialog>

      <ConfirmarDialog
        aberto={apagarAlvo !== null}
        aoMudar={(aberto) => {
          if (!aberto) setApagarAlvo(null)
        }}
        titulo="Apagar orçamento"
        descricao={
          apagarAlvo
            ? `O orçamento ${apagarAlvo.numero} de ${apagarAlvo.cliente?.nome ?? 'cliente removido'} vai ser apagado, com as suas linhas e medições. A obra associada não é afetada.`
            : ''
        }
        ocupado={aApagar}
        aoConfirmar={() => void apagar()}
      />
    </>
  )
}
