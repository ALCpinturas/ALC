import { cn } from '@/lib/cn'

type Variante = 'marca' | 'monograma' | 'lockup' | 'marca-claro' | 'monograma-claro'

interface Ficheiro {
  src: string
  largura: number
  altura: number
}

/*
 * Todos os ficheiros derivam do mesmo desenho: IMAGES/LogoOriginal.jpeg (a marca em si)
 * e IMAGES/IMG_7581.JPG / IMG_7584.JPG (a mesma marca, fotografada em resolução mais alta,
 * onde o pé do L e o traço central são nítidos — a origem de IMAGES/export/).
 *
 * A pincelada era, até 2026-09, uma fotografia de tinta com textura de cerdas, em PNG —
 * por isso ficava limitada à resolução exportada. Foi redesenhada como vetor (a mesma
 * composição em cerdas sobrepostas, cada uma com o seu gradiente pastel) para ficar nítida
 * a qualquer tamanho, tal como "marca". Por isso "marca", "marca-claro", "monograma" e
 * "monograma-claro" são todos vetor puro (IMAGES/export/vector) e nunca pixelizam.
 *
 * "lockup" acrescenta o nome por baixo do monograma. Vetorizar esse texto exigiria embutir
 * a fonte (Bodoni Moda) dentro do SVG — frágil em <img>, que não herda os tipos de letra da
 * página — por isso "lockup" continua a ser um PNG com canal alfa: o monograma vetorial
 * acima, renderizado a alta resolução, com o nome recortado do PNG original por baixo.
 */
const FICHEIROS: Record<Variante, Ficheiro> = {
  marca: { src: '/logo-alc-marca.svg', largura: 522, altura: 344 },
  'marca-claro': { src: '/logo-alc-marca-claro.svg', largura: 522, altura: 344 },
  monograma: { src: '/logo-alc-monograma.svg', largura: 725, altura: 455 },
  'monograma-claro': { src: '/logo-alc-monograma-claro.svg', largura: 725, altura: 455 },
  lockup: { src: '/logo-alc.png', largura: 2175, altura: 1365 },
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
