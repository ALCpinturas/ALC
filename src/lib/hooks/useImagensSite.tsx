import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { comprimirImagem, tipoAceite } from '@/lib/imagens'
import { fundirImagensSite, type ImagemSiteResolvida } from '@/lib/imagensSite'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { ChaveImagemSite, ImagemSiteRow } from '@/types/database'

const BALDE = 'site-imagens'

export function useImagensSite() {
  const [linhas, setLinhas] = useState<ImagemSiteRow[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    setErro(null)
    const { data, error } = await supabase.from('imagens_site').select('*')
    if (error) {
      setErro(mensagemErro(error))
      setLinhas([])
    } else {
      setLinhas(data ?? [])
    }
    setACarregar(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const imagens = useMemo(() => fundirImagensSite(linhas), [linhas])
  const porChave = useCallback(
    (chave: ChaveImagemSite) => imagens.find((imagem) => imagem.chave === chave)!,
    [imagens],
  )

  return { imagens, porChave, aCarregar, erro, recarregar: carregar }
}

const ContextoImagensSite = createContext<((chave: ChaveImagemSite) => ImagemSiteResolvida) | null>(
  null,
)

export function ImagensSiteProvider({ children }: { children: ReactNode }) {
  const { porChave } = useImagensSite()
  return <ContextoImagensSite.Provider value={porChave}>{children}</ContextoImagensSite.Provider>
}

export function useSlotImagemSite(chave: ChaveImagemSite): ImagemSiteResolvida {
  const porChave = useContext(ContextoImagensSite)
  if (porChave) return porChave(chave)
  return fundirImagensSite([]).find((imagem) => imagem.chave === chave)!
}

export async function substituirImagemSite(
  slot: ImagemSiteResolvida,
  ficheiro: File,
  textoAlternativo: string,
): Promise<string | null> {
  if (!tipoAceite(ficheiro)) return 'Este tipo de ficheiro não é aceite. Use JPEG, PNG ou WebP.'

  const comprimida = await comprimirImagem(ficheiro, {
    larguraMaxima: slot.larguraMaxima,
    qualidade: 0.82,
  })
  const caminho = `${slot.chave}/${crypto.randomUUID()}.jpg`
  const { error: erroUpload } = await supabase.storage.from(BALDE).upload(caminho, comprimida.ficheiro, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (erroUpload) return mensagemErro(erroUpload)

  const { data: publica } = supabase.storage.from(BALDE).getPublicUrl(caminho)
  const { error: erroUpdate } = await supabase
    .from('imagens_site')
    .update({
      url: publica.publicUrl,
      texto_alternativo: textoAlternativo.trim() || slot.textoAlternativo,
      storage_path: caminho,
      atualizado_em: new Date().toISOString(),
    })
    .eq('chave', slot.chave)

  if (erroUpdate) {
    await supabase.storage.from(BALDE).remove([caminho])
    return mensagemErro(erroUpdate)
  }

  if (slot.storage_path) {
    await supabase.storage.from(BALDE).remove([slot.storage_path])
  }
  return null
}

export async function reporImagemSite(slot: ImagemSiteResolvida): Promise<string | null> {
  const { error } = await supabase
    .from('imagens_site')
    .update({
      url: slot.predefinida,
      texto_alternativo: slot.textoAlternativo,
      storage_path: null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('chave', slot.chave)
  if (error) return mensagemErro(error)
  if (slot.storage_path) {
    await supabase.storage.from(BALDE).remove([slot.storage_path])
  }
  return null
}
