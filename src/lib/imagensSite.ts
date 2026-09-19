import type { ImagemSiteRow } from '@/types/database'

export const CHAVES_IMAGEM_SITE = [
  'hero',
  'sobre',
  'servico_pintura',
  'servico_pladur',
  'servico_pavimentos',
  'servico_acabamentos',
] as const

export type ChaveImagemSite = (typeof CHAVES_IMAGEM_SITE)[number]

export interface DefinicaoSlotImagem {
  chave: ChaveImagemSite
  rotulo: string
  onde: string
  predefinida: string
  textoAlternativo: string
  larguraMaxima: number
}

export const SLOTS_IMAGEM_SITE: readonly DefinicaoSlotImagem[] = [
  {
    chave: 'hero',
    rotulo: 'Abertura',
    onde: 'Primeira imagem do site, ao lado do título.',
    predefinida: '/site/hero.jpg',
    textoAlternativo:
      'Sala renovada com paredes recém-pintadas, tecto em pladur e pavimento em madeira clara.',
    larguraMaxima: 1920,
  },
  {
    chave: 'sobre',
    rotulo: 'Quem somos',
    onde: 'Secção sobre a ALC.',
    predefinida: '/site/sobre.jpg',
    textoAlternativo: 'Dois profissionais da ALC a trabalhar no acabamento de uma parede.',
    larguraMaxima: 1400,
  },
  {
    chave: 'servico_pintura',
    rotulo: 'Pintura',
    onde: 'Cartão do serviço de pintura.',
    predefinida: '/site/servico-pintura.jpg',
    textoAlternativo: 'Pintura interior: parede recém-pintada, rolo e tabuleiro de tinta.',
    larguraMaxima: 1200,
  },
  {
    chave: 'servico_pladur',
    rotulo: 'Tetos falsos e divisórias',
    onde: 'Cartão do serviço de pladur.',
    predefinida: '/site/servico-pladur.jpg',
    textoAlternativo: 'Montagem de tecto falso e divisória em pladur.',
    larguraMaxima: 1200,
  },
  {
    chave: 'servico_pavimentos',
    rotulo: 'Pavimentos',
    onde: 'Cartão do serviço de pavimentos.',
    predefinida: '/site/servico-pavimentos.jpg',
    textoAlternativo: 'Pavimento flutuante em madeira clara recém-aplicado.',
    larguraMaxima: 1200,
  },
  {
    chave: 'servico_acabamentos',
    rotulo: 'Acabamentos',
    onde: 'Cartão do serviço de acabamentos.',
    predefinida: '/site/servico-acabamentos.jpg',
    textoAlternativo: 'Pormenor de acabamento: rodapé e aros de porta alinhados com a parede.',
    larguraMaxima: 1200,
  },
]

export interface ImagemSiteResolvida extends DefinicaoSlotImagem {
  url: string
  texto_alternativo: string
  storage_path: string | null
  personalizada: boolean
}

export function fundirImagensSite(linhas: readonly ImagemSiteRow[]): ImagemSiteResolvida[] {
  const porChave = new Map(linhas.map((linha) => [linha.chave, linha]))

  return SLOTS_IMAGEM_SITE.map((slot) => {
    const linha = porChave.get(slot.chave)
    const url = linha?.url?.trim() ? linha.url : slot.predefinida
    const storagePath = linha?.storage_path ?? null
    return {
      ...slot,
      url,
      texto_alternativo: linha?.texto_alternativo?.trim()
        ? linha.texto_alternativo
        : slot.textoAlternativo,
      storage_path: storagePath,
      personalizada: Boolean(storagePath),
    }
  })
}
