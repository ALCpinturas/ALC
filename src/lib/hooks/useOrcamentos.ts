import { useCallback, useEffect, useState } from 'react'
import { totalLinhaCentimos, totais } from '@/lib/calculo/orcamento'
import { CONDICOES_ORCAMENTO_PADRAO } from '@/lib/empresa'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { EstadoOrcamento, LeadUnificada, OrcamentoRow, PrecoUnitarioRow } from '@/types/database'

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
  lead?: Pick<LeadUnificada, 'trabalhos' | 'area_m2'> | null,
): Promise<{ id: string } | { erro: string }> {
  const linhas = await linhasDaLead(lead)
  const IVA_TAXA = 23
  const calculo = totais(linhas, 0, IVA_TAXA)

  const { data, error } = await supabase
    .from('orcamentos')
    .insert({
      cliente_id: clienteId,
      obra_id: obraId ?? null,
      data_emissao: null,
      validade_dias: 30,
      subtotal_cents: calculo.subtotal_cents,
      desconto_cents: 0,
      iva_taxa: IVA_TAXA,
      iva_cents: calculo.iva_cents,
      total_cents: calculo.total_cents,
      condicoes: CONDICOES_ORCAMENTO_PADRAO,
      notas: null,
      pdf_path: null,
      criado_por: criadoPor,
    })
    .select('id')
    .single()

  if (error || !data) return { erro: mensagemErro(error) }

  if (linhas.length > 0) {
    const { error: erroLinhas } = await supabase
      .from('orcamento_linhas')
      .insert(linhas.map((linha) => ({ ...linha, orcamento_id: data.id })))
    if (erroLinhas) {
      // O orçamento já existe, só sem as linhas: apagá-lo evita deixar um rascunho vazio.
      await supabase.from('orcamentos').delete().eq('id', data.id)
      return { erro: mensagemErro(erroLinhas) }
    }
  }
  return { id: data.id }
}

/**
 * Linhas de partida de um orçamento nascido de uma lead da calculadora: um capítulo por
 * trabalho pedido, com a área indicada e o preço do catálogo. São só um ponto de partida,
 * ficam editáveis no orçamento. Leads sem trabalhos ou sem área (formulário de contacto)
 * dão um orçamento vazio, como antes.
 */
async function linhasDaLead(lead?: Pick<LeadUnificada, 'trabalhos' | 'area_m2'> | null) {
  const chaves = lead?.trabalhos ?? []
  if (chaves.length === 0) return []

  const { data } = await supabase
    .from('precos_unitarios')
    .select('chave, descricao, capitulo, unidade, preco_cents, ordem')
    .eq('ativo', true)
    .in('chave', chaves)
  const precos = (data ?? []) as Pick<
    PrecoUnitarioRow,
    'chave' | 'descricao' | 'capitulo' | 'unidade' | 'preco_cents' | 'ordem'
  >[]

  const area = lead?.area_m2 && lead.area_m2 > 0 ? lead.area_m2 : 1
  return chaves.flatMap((chave, indice) => {
    const preco = precos.find((item) => item.chave === chave)
    if (!preco) return []
    // A área só faz sentido em m²; noutras unidades fica 1 para a ALC acertar à mão.
    const quantidade = preco.unidade === 'm2' ? area : 1
    return [
      {
        capitulo: preco.capitulo,
        ordem: indice + 1,
        descricao: preco.descricao,
        unidade: preco.unidade,
        quantidade,
        preco_unitario_cents: preco.preco_cents,
        total_linha_cents: totalLinhaCentimos(quantidade, preco.preco_cents),
      },
    ]
  })
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
