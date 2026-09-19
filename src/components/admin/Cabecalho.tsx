import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'

interface CabecalhoProps {
  titulo: string
  subtitulo?: string
  voltarPara?: string
  acoes?: ReactNode
}

export default function Cabecalho({ titulo, subtitulo, voltarPara, acoes }: CabecalhoProps) {
  return (
    <div className="border-b border-alc-line bg-white px-4 py-4 md:px-6">
      {voltarPara ? (
        <Link
          to={voltarPara}
          className="mb-2 inline-flex items-center gap-1 text-sm text-alc-rose-deep"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Voltar
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-alc-black md:text-3xl">{titulo}</h1>
          {subtitulo ? <p className="mt-1 text-sm text-alc-ink">{subtitulo}</p> : null}
        </div>
        {acoes ? <div className="flex flex-wrap gap-2">{acoes}</div> : null}
      </div>
    </div>
  )
}
