import { cn } from '@/lib/cn'
import { useSlotImagemSite } from '@/lib/hooks/useImagensSite'
import type { ChaveImagemSite } from '@/types/database'

interface ImagemSiteProps {
  chave: ChaveImagemSite
  className?: string
  prioritario?: boolean
  largura?: number
  altura?: number
}

export default function ImagemSite({
  chave,
  className,
  prioritario = false,
  largura,
  altura,
}: ImagemSiteProps) {
  const imagem = useSlotImagemSite(chave)

  return (
    <img
      src={imagem.url}
      alt={imagem.texto_alternativo}
      width={largura}
      height={altura}
      loading={prioritario ? 'eager' : 'lazy'}
      fetchPriority={prioritario ? 'high' : 'low'}
      decoding="async"
      className={cn('size-full object-cover', className)}
    />
  )
}
