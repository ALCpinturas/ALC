import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import './logo-animado.css'

interface LogoAnimadoProps {
  altura: number
  className?: string
}

/** Logo AC com a animação de entrada (CSS puro; respeita "reduzir movimento"). */
export default function LogoAnimado({ altura, className }: LogoAnimadoProps) {
  const estilo = { '--ac-largura': `${Math.round((667 / 820) * altura)}px` } as CSSProperties

  return (
    <div className={cn('ac-logo', className)} style={estilo} role="img" aria-label="ALC, Alexandre Luís Carlitos">
      <img className="ac-traco" src="/logo-animado/traco.png" alt="" />
      <img className="ac-lambda" src="/logo-animado/lambda.png" alt="" />
      <div className="ac-c">
        <img src="/logo-animado/c.png" alt="" />
        <span className="ac-brilho" />
      </div>
    </div>
  )
}
