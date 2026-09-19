import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalido?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalido = false, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalido || undefined}
      className={cn(
        'w-full rounded-[2px] border bg-white p-3 text-base text-alc-black placeholder:text-alc-ink/50',
        'transition-colors focus:border-alc-rose-dark',
        invalido ? 'border-alc-rose-deep' : 'border-alc-line',
        className,
      )}
      {...props}
    />
  )
})

export default Textarea
