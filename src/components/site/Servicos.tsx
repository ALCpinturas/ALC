import type { ChaveImagemSite } from '@/types/database'
import ImagemSite from './ImagemSite'
import Seccao from './Seccao'

interface Servico {
  titulo: string
  abertura: string
  trabalhos: string[]
  imagem: ChaveImagemSite
}

const SERVICOS: Servico[] = [
  {
    titulo: 'Pintura',
    abertura: 'Uma nova pintura pode transformar completamente um espaço.',
    imagem: 'servico_pintura',
    trabalhos: [
      'Pintura interior',
      'Pintura exterior',
      'Paredes e tetos',
      'Portas e madeiras',
      'Reparação de fissuras',
      'Preparação e primários',
      'Acabamentos decorativos',
    ],
  },
  {
    titulo: 'Tetos falsos e divisórias',
    abertura: 'Mais do que dividir espaços, é criar novas possibilidades.',
    imagem: 'servico_pladur',
    trabalhos: [
      'Tetos falsos',
      'Divisórias',
      'Sancas e cortineiros',
      'Caixas técnicas',
      'Nichos e elementos decorativos',
      'Soluções para iluminação',
      'Isolamento térmico e acústico',
    ],
  },
  {
    titulo: 'Pavimentos',
    abertura: 'O chão muda a forma como sentimos um espaço.',
    imagem: 'servico_pavimentos',
    trabalhos: [
      'Pavimento flutuante',
      'Pavimento vinílico',
      'Cerâmica',
      'Soalho',
      'Rodapés',
      'Preparação e regularização de superfícies',
      'Substituição de pavimentos existentes',
    ],
  },
  {
    titulo: 'Acabamentos',
    abertura: 'É no acabamento que se percebe o cuidado.',
    imagem: 'servico_acabamentos',
    trabalhos: [
      'Rodapés',
      'Estuques',
      'Reparação de paredes',
      'Remates',
      'Acabamentos de pladur',
      'Correções e retoques finais',
    ],
  },
]

export default function Servicos() {
  return (
    <Seccao id="servicos" fundo="cinza" titulo="O que fazemos">
      <div className="grid gap-px bg-alc-line sm:grid-cols-2">
        {SERVICOS.map((servico) => (
          <article key={servico.titulo} className="bg-alc-grey">
            <div className="aspect-[4/3] overflow-hidden">
              <ImagemSite chave={servico.imagem} largura={1200} altura={900} />
            </div>
            <div className="p-6 md:p-8">
              <h3 className="font-display text-2xl text-alc-black">{servico.titulo}</h3>
              <p className="mt-2 text-alc-ink">{servico.abertura}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {servico.trabalhos.map((trabalho) => (
                  <li key={trabalho} className="flex gap-3">
                    <span aria-hidden className="mt-2 block h-px w-4 shrink-0 bg-alc-rose-dark" />
                    {trabalho}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </Seccao>
  )
}
