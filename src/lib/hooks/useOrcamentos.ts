import { useCallback, useEffect, useState } from 'react'
import { CONDICOES_ORCAMENTO_PADRAO } from '@/lib/empresa'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { EstadoOrcamento, OrcamentoRow } from '@/types/database'

export interface OrcamentoComRelacoes extends OrcamentoRow {
  cliente: { id: string; nome: string } | null
  obra: { id: string; numero: string; titulo: string } | null
}

export interface FiltrosOrcamentos {
  estado: EstadoOrcamento | 'todos'
  cliente_id: string | 'todos'
}

export const FILTROS_ORCAMENTOS_INICIAIS: FiltrosOrcamentos = {
  estado: 'todos',
  cliente_id: 'todos',
}

const SELECT = '*, cliente:clientes(id, nome), obra:obras(id, numero, titulo)'

export function useOrcamentos(filtros: FiltrosOrcamentos, limite?: number) {
  const [orcamentos, setOrcamentos] = useState<OrcamentoComRelacoes[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    setErro(null)

    let consulta = supabase.from('orcamentos').select(SELECT)
    if (filtros.estado !== 'todos') consulta = consulta.eq('estado', filtros.estado)
    if (filtros.cliente_id !== 'todos') consulta = consulta.eq('cliente_id', filtros.cliente_id)

    const ordenada = consulta.order('criado_em', { ascending: false })
    const { data, error } = limite ? await ordenada.limit(limite) : await ordenada

    if (error) {
      setErro(mensagemErro(error))
      setOrcamentos([])
    } else {
      setOrcamentos((data ?? []) as unknown as OrcamentoComRelacoes[])
    }
    setACarregar(false)
  }, [filtros.cliente_id, filtros.estado, limite])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { orcamentos, aCarregar, erro, recarregar: carregar }
}

/**
 * Cria um orçamento a partir do cliente. A obra fica por associar: só faz sentido depois
 * de a proposta ser aceite, e é o que torna este passo rápido.
 */
export async function criarOrcamento(
  clienteId: string,
  criadoPor: string | null,
  obraId?: string | null,
): Promise<{ id: string } | { erro: string }> {
  const { data, error } = await supabase
    .from('orcamentos')
    .insert({
      cliente_id: clienteId,
      obra_id: obraId ?? null,
      data_emissao: null,
      validade_dias: 30,
      subtotal_cents: 0,
      desconto_cents: 0,
      iva_taxa: 23,
      iva_cents: 0,
      total_cents: 0,
      condicoes: CONDICOES_ORCAMENTO_PADRAO,
      notas: null,
      pdf_path: null,
      criado_por: criadoPor,
    })
    .select('id')
    .single()

  if (error || !data) return { erro: mensagemErro(error) }
  return { id: data.id }
}

/**
 * Cria uma nova versão de um orçamento já enviado, aceite, recusado ou expirado.
 * A versão antiga fica intacta como histórico; a nova nasce em rascunho, pronta a editar.
 */
export async function criarNovaVersaoOrcamento(
  orcamentoId: string,
): Promise<{ id: string } | { erro: string }> {
  const { data, error } = await supabase.rpc('criar_nova_versao_orcamento', {
    p_orcamento_id: orcamentoId,
  })
  if (error || !data) return { erro: mensagemErro(error) }
  return { id: data }
}
