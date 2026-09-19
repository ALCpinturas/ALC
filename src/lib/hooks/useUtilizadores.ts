import { useCallback, useEffect, useState } from 'react'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { PerfilRow } from '@/types/database'

/**
 * Lista de contas do backoffice, para o administrador confirmar quem tem acesso.
 * A política de RLS de `perfis` só deixa um não-admin ver o próprio registo, por isso
 * quem não é admin recebe sempre uma lista com uma só linha.
 */
export function useUtilizadores() {
  const [utilizadores, setUtilizadores] = useState<PerfilRow[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    setErro(null)

    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('criado_em', { ascending: true })

    if (error) {
      setErro(mensagemErro(error))
      setUtilizadores([])
    } else {
      setUtilizadores(data ?? [])
    }
    setACarregar(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { utilizadores, aCarregar, erro, recarregar: carregar }
}
