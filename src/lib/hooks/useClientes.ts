import { useCallback, useEffect, useState } from 'react'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { ClienteRow } from '@/types/database'

export const CLIENTES_POR_PAGINA = 25

export interface ClienteComContagem extends ClienteRow {
  obras: { count: number }[]
}

export function useClientes(pesquisa: string, pagina: number) {
  const [clientes, setClientes] = useState<ClienteComContagem[]>([])
  const [total, setTotal] = useState(0)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    setErro(null)

    let consulta = supabase.from('clientes').select('*, obras(count)', { count: 'exact' })

    const termo = pesquisa.trim()
    if (termo) {
      const escapado = termo.replace(/[%,()]/g, ' ')
      consulta = consulta.or(
        `nome.ilike.%${escapado}%,telefone.ilike.%${escapado}%,email.ilike.%${escapado}%,nif.ilike.%${escapado}%`,
      )
    }

    const inicio = pagina * CLIENTES_POR_PAGINA
    const { data, error, count } = await consulta
      .order('nome', { ascending: true })
      .range(inicio, inicio + CLIENTES_POR_PAGINA - 1)

    if (error) {
      setErro(mensagemErro(error))
      setClientes([])
      setTotal(0)
    } else {
      setClientes((data ?? []) as unknown as ClienteComContagem[])
      setTotal(count ?? 0)
    }
    setACarregar(false)
  }, [pagina, pesquisa])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { clientes, total, aCarregar, erro, recarregar: carregar }
}

export function useCliente(id: string | undefined) {
  const [cliente, setCliente] = useState<ClienteRow | null>(null)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!id) return
    setACarregar(true)
    const { data, error } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle()
    setCliente(data)
    setErro(error ? mensagemErro(error) : null)
    setACarregar(false)
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { cliente, aCarregar, erro, recarregar: carregar }
}
