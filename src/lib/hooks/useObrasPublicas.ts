import { useCallback, useEffect, useState } from 'react'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { ObraPublicaImagemRow, ObraPublicaRow } from '@/types/database'

export interface ObraPublica extends ObraPublicaRow {
  imagens: ObraPublicaImagemRow[]
}

export function useObrasPublicas() {
  const [obras, setObras] = useState<ObraPublica[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    setErro(null)
    const { data, error } = await supabase
      .from('obras_publicas')
      .select('*, obras_publicas_imagens(*)')
      .eq('visivel', true)
      .order('ordem', { ascending: true })

    if (error) {
      setErro(mensagemErro(error))
      setObras([])
    } else {
      const linhas = (data ?? []) as unknown as (ObraPublicaRow & {
        obras_publicas_imagens: ObraPublicaImagemRow[] | null
      })[]
      setObras(
        linhas.map((linha) => {
          const { obras_publicas_imagens, ...obra } = linha
          const imagens = (obras_publicas_imagens ?? [])
            .filter((imagem) => imagem.visivel)
            .sort((a, b) => a.ordem - b.ordem)
          return { ...obra, imagens }
        }),
      )
    }
    setACarregar(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { obras, aCarregar, erro, recarregar: carregar }
}
