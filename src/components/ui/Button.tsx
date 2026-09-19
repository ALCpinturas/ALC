import { Slot } from '@radix-ui/react-slot'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo'
type Tamanho = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-alc-rose-dark text-white hover:bg-alc-rose-deep active:bg-alc-rose-deep',
  secundario:
    'border border-alc-black bg-transparent text-alc-black hover:bg-alc-black hover:text-white',
  fantasma: 'bg-transparent text-alc-black hover:bg-alc-grey',
  perigo: 'border border-alc-rose-deep bg-transparent text-alc-rose-deep hover:bg-alc-rose-light',
}

const TAMANHOS: Record<Tamanho, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm md:h-10',
  lg: 'h-12 px-6 text-base',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamanho?: Tamanho
  asChild?: boolean
  ocupado?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variante = 'primario', tamanho = 'md', asChild = false, ocupado = false, children, disabled, ...props },
  ref,
) {
  const estilo = cn(
    'inline-flex items-center justify-center gap-2 rounded-[2px] font-body font-medium tracking-wide uppercase transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTES[variante],
    TAMANHOS[tamanho],
    className,
  )

  // O Slot do Radix exige um único filho. Com asChild o conteúdo é passado tal e qual,
  // sem indicador de espera: asChild serve para transformar o botão numa ligação, e uma
  // ligação não fica em estado de espera.
  if (asChild) {
    return (
      <Slot ref={ref} className={estilo} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button ref={ref} disabled={disabled || ocupado} className={estilo} {...props}>
      {ocupado ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
})

export default Button
