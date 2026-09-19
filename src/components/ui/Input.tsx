import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalido?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalido = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalido || undefined}
      className={cn(
        'h-12 w-full rounded-[2px] border bg-white px-3 text-base text-alc-black placeholder:text-alc-ink/50',
        'transition-colors focus:border-alc-rose-dark disabled:bg-alc-grey disabled:text-alc-ink/60',
        invalido ? 'border-alc-rose-deep' : 'border-alc-line',
        className,
      )}
      {...props}
    />
  )
})

export default Input
