import { useCallback, useEffect, useState } from 'react'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { EstadoObra, ObraRow, TipoIntervencao } from '@/types/database'

export interface ObraComCliente extends ObraRow {
  cliente: { id: string; nome: string } | null
}

export interface FiltrosObras {
  estado: EstadoObra | 'todos'
  cliente_id: string | 'todos'
  tipo: TipoIntervencao | 'todos'
}

export const FILTROS_OBRAS_INICIAIS: FiltrosObras = {
  estado: 'todos',
  cliente_id: 'todos',
  tipo: 'todos',
}

export function useObras(filtros: FiltrosObras) {
  const [obras, setObras] = useState<ObraComCliente[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    setErro(null)

    let consulta = supabase.from('obras').select('*, cliente:clientes(id, nome)')
    if (filtros.estado !== 'todos') consulta = consulta.eq('estado', filtros.estado)
    if (filtros.cliente_id !== 'todos') consulta = consulta.eq('cliente_id', filtros.cliente_id)
    if (filtros.tipo !== 'todos') consulta = consulta.contains('tipos_intervencao', [filtros.tipo])

    const { data, error } = await consulta.order('criado_em', { ascending: false })

    if (error) {
      setErro(mensagemErro(error))
      setObras([])
    } else {
      setObras((data ?? []) as unknown as ObraComCliente[])
    }
    setACarregar(false)
  }, [filtros.cliente_id, filtros.estado, filtros.tipo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { obras, aCarregar, erro, recarregar: carregar, setObras }
}

export function useObra(id: string | undefined) {
  const [obra, setObra] = useState<ObraComCliente | null>(null)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!id) return
    setACarregar(true)
    const { data, error } = await supabase
      .from('obras')
      .select('*, cliente:clientes(id, nome)')
      .eq('id', id)
      .maybeSingle()
    setObra((data ?? null) as unknown as ObraComCliente | null)
    setErro(error ? mensagemErro(error) : null)
    setACarregar(false)
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { obra, aCarregar, erro, recarregar: carregar, setObra }
}

export async function mudarEstadoObra(id: string, estado: EstadoObra): Promise<string | null> {
  const { error } = await supabase.from('obras').update({ estado }).eq('id', id)
  return error ? mensagemErro(error) : null
}
