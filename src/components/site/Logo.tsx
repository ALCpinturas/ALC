import { cn } from '@/lib/cn'

type Variante = 'marca' | 'monograma' | 'lockup' | 'marca-claro' | 'monograma-claro'

interface Ficheiro {
  src: string
  largura: number
  altura: number
}

/*
 * Todos os ficheiros derivam do mesmo desenho, agora fotografado a alta resolução
 * (IMAGES/LogoOriginal4k.jpeg, com o recorte de transparência a partir de
 * IMAGES/LogoOriginal4ksemfundo.jpeg). "marca", "marca-claro", "monograma" e
 * "monograma-claro" são PNG com canal alfa em vez de vetor: a pincelada tem textura
 * pictórica real que não se recria em caminhos SVG. Exportados a uma resolução bem acima
 * do maior uso no site (altura 250-400px contra os 44-96px renderizados), por isso não
 * pixelizam em ecrãs de alta densidade nos tamanhos em que são usados.
 *
 * "lockup" acrescenta o nome por baixo do monograma: o monograma novo, com o nome
 * recortado do logo-alc.png anterior por baixo (esse texto continua vetorial na origem,
 * só não há motivo para o refazer).
 */
const FICHEIROS: Record<Variante, Ficheiro> = {
  marca: { src: '/logo-alc-marca.png', largura: 186, altura: 250 },
  'marca-claro': { src: '/logo-alc-marca-claro.png', largura: 186, altura: 250 },
  monograma: { src: '/logo-alc-monograma.png', largura: 212, altura: 250 },
  'monograma-claro': { src: '/logo-alc-monograma-claro.png', largura: 212, altura: 250 },
  lockup: { src: '/logo-alc.png', largura: 322, altura: 400 },
}

interface LogoProps {
  variante?: Variante
  altura: number
  prioritario?: boolean
  className?: string
}

/** Nenhum outro ficheiro do projeto referencia caminhos de logótipo diretamente. */
export default function Logo({
  variante = 'marca',
  altura,
  prioritario = false,
  className,
}: LogoProps) {
  const ficheiro = FICHEIROS[variante]
  const largura = Math.round((ficheiro.largura / ficheiro.altura) * altura)

  return (
    <img
      src={ficheiro.src}
      width={largura}
      height={altura}
      style={{ height: altura, width: largura }}
      loading={prioritario ? 'eager' : 'lazy'}
      decoding={prioritario ? 'sync' : 'async'}
      {...(prioritario ? { fetchPriority: 'high' as const } : {})}
      alt="ALC, Alexandre Luís Carlitos"
      className={cn('object-contain', className)}
    />
  )
}
