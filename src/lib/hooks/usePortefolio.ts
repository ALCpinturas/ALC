import { useCallback, useEffect, useState } from 'react'
import type { ObraPublicaComImagens } from '@/lib/portefolio'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { ObraPublicaImagemRow, ObraPublicaRow } from '@/types/database'

type LinhaComImagens = ObraPublicaRow & { obras_publicas_imagens: ObraPublicaImagemRow[] | null }

function comImagensOrdenadas(linha: LinhaComImagens): ObraPublicaComImagens {
  const { obras_publicas_imagens, ...obra } = linha
  const imagens = [...(obras_publicas_imagens ?? [])].sort((a, b) => a.ordem - b.ordem)
  return { ...obra, imagens }
}

/** Todas as obras do portefólio, visíveis ou não: esta é a vista de gestão, não a pública. */
export function usePortefolio() {
  const [obras, setObras] = useState<ObraPublicaComImagens[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    setErro(null)
    const { data, error } = await supabase
      .from('obras_publicas')
      .select('*, obras_publicas_imagens(*)')
      .order('ordem', { ascending: true })

    if (error) {
      setErro(mensagemErro(error))
      setObras([])
    } else {
      const linhas = (data ?? []) as unknown as LinhaComImagens[]
      setObras(linhas.map(comImagensOrdenadas))
    }
    setACarregar(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { obras, aCarregar, erro, recarregar: carregar, setObras }
}

export function useObraPublica(id: string | undefined) {
  const [obra, setObra] = useState<ObraPublicaComImagens | null>(null)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!id) return
    setACarregar(true)
    const { data, error } = await supabase
      .from('obras_publicas')
      .select('*, obras_publicas_imagens(*)')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      setErro(mensagemErro(error))
      setObra(null)
    } else {
      setErro(null)
      setObra(data ? comImagensOrdenadas(data as unknown as LinhaComImagens) : null)
    }
    setACarregar(false)
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { obra, aCarregar, erro, recarregar: carregar, setObra }
}
