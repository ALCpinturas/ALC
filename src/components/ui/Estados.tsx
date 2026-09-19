import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EsqueletoProps {
  className?: string
}

export function Esqueleto({ className }: EsqueletoProps) {
  return <div aria-hidden className={cn('animate-pulse rounded-[2px] bg-alc-grey', className)} />
}

interface EstadoVazioProps {
  titulo: string
  descricao?: string
  acao?: ReactNode
  className?: string
}

export function EstadoVazio({ titulo, descricao, acao, className }: EstadoVazioProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 border border-dashed border-alc-line px-6 py-12 text-center',
        className,
      )}
    >
      <p className="font-display text-lg text-alc-black">{titulo}</p>
      {descricao ? <p className="max-w-sm text-sm text-alc-ink">{descricao}</p> : null}
      {acao ? <div className="mt-3">{acao}</div> : null}
    </div>
  )
}

interface EstadoErroProps {
  mensagem: string
  aoRepetir?: () => void
  className?: string
}

export function EstadoErro({ mensagem, aoRepetir, className }: EstadoErroProps) {
  return (
    <div
      role="alert"
      className={cn('border border-alc-rose-dark bg-alc-rose-light/60 px-4 py-3 text-sm', className)}
    >
      <p className="font-medium text-alc-black">Não foi possível carregar a informação.</p>
      <p className="mt-1 text-alc-ink">{mensagem}</p>
      {aoRepetir ? (
        <button
          type="button"
          onClick={aoRepetir}
          className="mt-2 font-medium text-alc-rose-deep underline underline-offset-4"
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  )
}
