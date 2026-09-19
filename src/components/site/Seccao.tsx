import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SeccaoProps {
  id: string
  titulo?: string
  subtitulo?: string
  fundo?: 'branco' | 'cinza' | 'rosa' | 'escuro'
  children: ReactNode
  className?: string
}

const FUNDOS = {
  branco: 'bg-white',
  cinza: 'bg-alc-grey',
  rosa: 'bg-alc-rose-light',
  escuro: 'bg-alc-black text-white',
}

export default function Seccao({
  id,
  titulo,
  subtitulo,
  fundo = 'branco',
  children,
  className,
}: SeccaoProps) {
  return (
    <section id={id} className={cn('scroll-mt-20 px-4 py-16 md:px-6 md:py-24', FUNDOS[fundo], className)}>
      <div className="mx-auto max-w-6xl">
        {titulo ? (
          <header className="mb-10 max-w-2xl">
            <h2
              className={cn(
                'font-display text-3xl leading-tight md:text-4xl',
                fundo === 'escuro' ? 'text-white' : 'text-alc-black',
              )}
            >
              {titulo}
            </h2>
            {subtitulo ? (
              <p className={cn('mt-3 text-lg', fundo === 'escuro' ? 'text-white/80' : 'text-alc-ink')}>
                {subtitulo}
              </p>
            ) : null}
          </header>
        ) : null}
        {children}
      </div>
    </section>
  )
}
