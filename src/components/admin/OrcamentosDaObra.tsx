import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Copy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { EstadoVazio } from '@/components/ui/Estados'
import { formatarData, formatarEuros } from '@/lib/format'
import { ROTULO_ESTADO_ORCAMENTO } from '@/lib/schemas/comum'
import { criarOrcamento } from '@/lib/hooks/useOrcamentos'
import { mensagemErro, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { OrcamentoRow } from '@/types/database'

interface OrcamentosDaObraProps {
  obraId: string
  clienteId: string
}

export default function OrcamentosDaObra({ obraId, clienteId }: OrcamentosDaObraProps) {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const [orcamentos, setOrcamentos] = useState<OrcamentoRow[]>([])
  const [aCriar, setACriar] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('obra_id', obraId)
      .order('criado_em', { ascending: false })
    if (error) {
      toast.error(`Não foi possível carregar os orçamentos. ${mensagemErro(error)}`)
      return
    }
    setOrcamentos(data ?? [])
  }, [obraId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function criar() {
    setACriar(true)
    const resultado = await criarOrcamento(clienteId, perfil?.id ?? null, obraId)
    setACriar(false)
    if ('erro' in resultado) {
      toast.error(`Não foi possível criar o orçamento. ${resultado.erro}`)
      return
    }
    void navegar(`/admin/orcamentos/${resultado.id}`)
  }

  async function duplicar(orcamento: OrcamentoRow) {
    const { data: novo, error } = await supabase
      .from('orcamentos')
      .insert({
        obra_id: orcamento.obra_id,
        cliente_id: orcamento.cliente_id,
        data_emissao: null,
        validade_dias: orcamento.validade_dias,
        subtotal_cents: orcamento.subtotal_cents,
        desconto_cents: orcamento.desconto_cents,
        iva_taxa: orcamento.iva_taxa,
        iva_cents: orcamento.iva_cents,
        total_cents: orcamento.total_cents,
        condicoes: orcamento.condicoes,
        notas: orcamento.notas,
        pdf_path: null,
        criado_por: perfil?.id ?? null,
      })
      .select('id')
      .single()

    if (error || !novo) {
      toast.error(`Não foi possível duplicar. ${mensagemErro(error)}`)
      return
    }

    const { data: linhas } = await supabase
      .from('orcamento_linhas')
      .select('*')
      .eq('orcamento_id', orcamento.id)
      .order('ordem')

    if (linhas?.length) {
      await supabase.from('orcamento_linhas').insert(
        linhas.map((linha) => ({
          orcamento_id: novo.id,
          capitulo: linha.capitulo,
          ordem: linha.ordem,
          descricao: linha.descricao,
          unidade: linha.unidade,
          quantidade: linha.quantidade,
          preco_unitario_cents: linha.preco_unitario_cents,
          total_linha_cents: linha.total_linha_cents,
        })),
      )
    }

    toast.success('Nova versão criada.')
    void navegar(`/admin/orcamentos/${novo.id}`)
  }

  return (
    <div className="space-y-4">
      <Button ocupado={aCriar} onClick={() => void criar()}>
        <Plus aria-hidden className="size-4" />
        Novo orçamento
      </Button>

      {orcamentos.length === 0 ? (
        <EstadoVazio titulo="Esta obra ainda não tem orçamentos." />
      ) : (
        <ul className="space-y-3">
          {orcamentos.map((orcamento) => (
            <li key={orcamento.id} className="border border-alc-line bg-white">
              <Link to={`/admin/orcamentos/${orcamento.id}`} className="block p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-alc-ink">
                      {orcamento.numero} · versão {orcamento.versao}
                    </p>
                    <p className="mt-1 font-medium text-alc-black">
                      {formatarEuros(orcamento.total_cents)}
                    </p>
                    <p className="mt-1 text-sm text-alc-ink">
                      {orcamento.data_emissao
                        ? `Emitido a ${formatarData(orcamento.data_emissao)} · validade ${orcamento.validade_dias} dias`
                        : 'Por emitir'}
                    </p>
                  </div>
                  <Badge tom={orcamento.estado === 'aceite' ? 'escuro' : 'neutro'}>
                    {ROTULO_ESTADO_ORCAMENTO[orcamento.estado]}
                  </Badge>
                </div>
              </Link>
              <div className="border-t border-alc-line p-3">
                <Button variante="fantasma" tamanho="sm" onClick={() => void duplicar(orcamento)}>
                  <Copy aria-hidden className="size-4" />
                  Duplicar como nova versão
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
