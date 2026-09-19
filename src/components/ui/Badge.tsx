import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tom = 'neutro' | 'rosa' | 'contorno' | 'escuro'

const TONS: Record<Tom, string> = {
  neutro: 'bg-alc-grey text-alc-black',
  rosa: 'bg-alc-rose-light text-alc-black',
  contorno: 'border border-alc-rose-dark text-alc-rose-deep',
  escuro: 'bg-alc-black text-white',
}

interface BadgeProps {
  tom?: Tom
  children: ReactNode
  className?: string
}

export default function Badge({ tom = 'neutro', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[2px] px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        TONS[tom],
        className,
      )}
    >
      {children}
    </span>
  )
}
