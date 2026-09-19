import { useCallback, useEffect, useState } from 'react'
import { mensagemErro, supabase } from '@/lib/supabase'
import type {
  ClienteRow,
  MedicaoRow,
  MedicaoVaoRow,
  ObraRow,
  OrcamentoLinhaRow,
  OrcamentoRow,
  PrecoUnitarioRow,
} from '@/types/database'

export interface MedicaoComVaos extends MedicaoRow {
  vaos: MedicaoVaoRow[]
}

interface DadosOrcamento {
  orcamento: OrcamentoRow | null
  obra: ObraRow | null
  cliente: ClienteRow | null
  linhas: OrcamentoLinhaRow[]
  medicoes: MedicaoComVaos[]
  precos: PrecoUnitarioRow[]
  aCarregar: boolean
  erro: string | null
}

const INICIAL: DadosOrcamento = {
  orcamento: null,
  obra: null,
  cliente: null,
  linhas: [],
  medicoes: [],
  precos: [],
  aCarregar: true,
  erro: null,
}

export function useOrcamento(id: string | undefined) {
  const [dados, setDados] = useState<DadosOrcamento>(INICIAL)

  const carregar = useCallback(async () => {
    if (!id) return
    setDados((anteriores) => ({ ...anteriores, aCarregar: true }))

    const { data: orcamento, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !orcamento) {
      setDados({
        ...INICIAL,
        aCarregar: false,
        erro: error ? mensagemErro(error) : 'Orçamento não encontrado.',
      })
      return
    }

    const [obra, cliente, linhas, medicoes, precos] = await Promise.all([
      orcamento.obra_id
        ? supabase.from('obras').select('*').eq('id', orcamento.obra_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('clientes').select('*').eq('id', orcamento.cliente_id).maybeSingle(),
      supabase.from('orcamento_linhas').select('*').eq('orcamento_id', id).order('ordem'),
      // As medições pertencem ao orçamento: são tiradas para orçamentar, antes de haver obra.
      supabase
        .from('medicoes')
        .select('*, vaos:medicoes_vaos(*)')
        .eq('orcamento_id', id)
        .order('ordem'),
      supabase.from('precos_unitarios').select('*').eq('ativo', true).order('ordem'),
    ])

    setDados({
      orcamento,
      obra: obra.data,
      cliente: cliente.data,
      linhas: linhas.data ?? [],
      medicoes: (medicoes.data ?? []) as unknown as MedicaoComVaos[],
      precos: precos.data ?? [],
      aCarregar: false,
      erro: null,
    })
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { ...dados, recarregar: carregar, setDados }
}
