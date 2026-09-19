import { Award, Compass, Eye, HandHeart, Ruler, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Seccao from './Seccao'

interface Bloco {
  icone: LucideIcon
  titulo: string
  texto: string
}

const BLOCOS: Bloco[] = [
  {
    icone: Award,
    titulo: 'Experiência',
    texto: 'Conhecimento adquirido através de anos de trabalho no terreno.',
  },
  {
    icone: Compass,
    titulo: 'Acompanhamento',
    texto: 'Não desaparecemos depois de aceitar a obra, acompanhamos cada fase.',
  },
  {
    icone: Eye,
    titulo: 'Transparência',
    texto: 'Orçamentos claros e comunicação direta.',
  },
  {
    icone: Ruler,
    titulo: 'Rigor',
    texto: 'A preparação e os acabamentos têm tanta importância como a execução.',
  },
  {
    icone: Wrench,
    titulo: 'Soluções à medida',
    texto: 'Cada espaço é diferente, as soluções também devem ser.',
  },
  {
    icone: HandHeart,
    titulo: 'Compromisso',
    texto: 'Assumimos responsabilidade pelo trabalho que fazemos.',
  },
]

export default function PorqueALC() {
  return (
    <Seccao id="porque-alc" fundo="cinza" titulo="Porquê a ALC">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {BLOCOS.map((bloco) => (
          <article key={bloco.titulo}>
            <bloco.icone aria-hidden className="size-6 text-alc-rose-dark" strokeWidth={1.5} />
            <h3 className="mt-4 font-display text-xl text-alc-black">{bloco.titulo}</h3>
            <p className="mt-2 text-alc-ink">{bloco.texto}</p>
          </article>
        ))}
      </div>
    </Seccao>
  )
}
