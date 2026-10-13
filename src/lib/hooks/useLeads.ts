import { useCallback, useEffect, useState } from 'react'
import { fimDoDiaLisboa, inicioDoDiaLisboa } from '@/lib/format'
import type { DadosLead } from '@/lib/schemas/gestao'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { EstadoLead, LeadUnificada } from '@/types/database'

export const POR_PAGINA = 25

export interface FiltrosLeads {
  estado: EstadoLead | 'todos'
  origem: 'todas' | 'formulario' | 'calculadora'
  de: string
  ate: string
  pesquisa: string
}

export const FILTROS_INICIAIS: FiltrosLeads = {
  estado: 'todos',
  origem: 'todas',
  de: '',
  ate: '',
  pesquisa: '',
}

interface Resultado {
  leads: LeadUnificada[]
  total: number
  aCarregar: boolean
  erro: string | null
  recarregar: () => Promise<void>
}

export function useLeads(filtros: FiltrosLeads, pagina: number): Resultado {
  const [leads, setLeads] = useState<LeadUnificada[]>([])
  const [total, setTotal] = useState(0)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    setErro(null)

    let consulta = supabase.from('leads_unificadas').select('*', { count: 'exact' })

    if (filtros.estado !== 'todos') consulta = consulta.eq('estado', filtros.estado)
    if (filtros.origem !== 'todas') consulta = consulta.eq('origem', filtros.origem)
    if (filtros.de) consulta = consulta.gte('criado_em', inicioDoDiaLisboa(filtros.de).toISOString())
    if (filtros.ate) consulta = consulta.lte('criado_em', fimDoDiaLisboa(filtros.ate).toISOString())

    const termo = filtros.pesquisa.trim()
    if (termo) {
      const escapado = termo.replace(/[%,()]/g, ' ')
      consulta = consulta.or(
        `nome.ilike.%${escapado}%,telefone.ilike.%${escapado}%,email.ilike.%${escapado}%`,
      )
    }

    const inicio = pagina * POR_PAGINA
    const { data, error, count } = await consulta
      .order('criado_em', { ascending: false })
      .range(inicio, inicio + POR_PAGINA - 1)

    if (error) {
      setErro(mensagemErro(error))
      setLeads([])
      setTotal(0)
    } else {
      setLeads((data ?? []) as LeadUnificada[])
      setTotal(count ?? 0)
    }
    setACarregar(false)
  }, [filtros.ate, filtros.de, filtros.estado, filtros.origem, filtros.pesquisa, pagina])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { leads, total, aCarregar, erro, recarregar: carregar }
}

export async function atualizarEstadoLead(
  lead: Pick<LeadUnificada, 'id' | 'tabela'>,
  estado: EstadoLead,
): Promise<string | null> {
  const { error } = await supabase
    .from(lead.tabela === 'leads_calculadora' ? 'leads_calculadora' : 'pedidos_contacto')
    .update({ estado })
    .eq('id', lead.id)
  return error ? mensagemErro(error) : null
}

export async function guardarNotasLead(
  lead: Pick<LeadUnificada, 'id' | 'tabela'>,
  notas: string,
): Promise<string | null> {
  const { error } = await supabase
    .from(lead.tabela === 'leads_calculadora' ? 'leads_calculadora' : 'pedidos_contacto')
    .update({ notas_internas: notas })
    .eq('id', lead.id)
  return error ? mensagemErro(error) : null
}

export async function atualizarLead(
  lead: Pick<LeadUnificada, 'id' | 'tabela'>,
  dados: DadosLead,
): Promise<string | null> {
  const { nome, telefone, email, localidade } = dados

  // A calculadora não tem campo de mensagem: só pedidos_contacto o grava.
  const { error } =
    lead.tabela === 'pedidos_contacto'
      ? await supabase
          .from('pedidos_contacto')
          .update({ nome, telefone, email, localidade, mensagem: dados.mensagem ?? '' })
          .eq('id', lead.id)
      : await supabase
          .from('leads_calculadora')
          .update({ nome, telefone, email, localidade })
          .eq('id', lead.id)

  return error ? mensagemErro(error) : null
}

export async function apagarLead(
  lead: Pick<LeadUnificada, 'id' | 'tabela' | 'fotografias'>,
): Promise<string | null> {
  // select() devolve as linhas apagadas: o RLS recusa em silêncio (sem erro, 0 linhas),
  // e sem esta verificação o pedido parecia apagado e voltava ao recarregar a lista.
  const { data, error } = await supabase.from(lead.tabela).delete().eq('id', lead.id).select('id')
  if (error) return mensagemErro(error)
  if (!data?.length) return 'Só um administrador pode apagar pedidos.'

  if (lead.fotografias?.length) {
    await supabase.storage.from('pedidos-fotografias').remove(lead.fotografias)
  }
  return null
}
