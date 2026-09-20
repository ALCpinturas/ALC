import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Input, { type InputProps } from './Input'
import { cn } from '@/lib/cn'

const InputPassword = forwardRef<HTMLInputElement, InputProps>(function InputPassword(
  { className, ...props },
  ref,
) {
  const [visivel, setVisivel] = useState(false)

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visivel ? 'text' : 'password'}
        className={cn('pr-12', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisivel((atual) => !atual)}
        aria-label={visivel ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
        aria-pressed={visivel}
        className="toque absolute inset-y-0 right-0 flex w-12 items-center justify-center text-alc-ink hover:text-alc-rose-deep"
      >
        {visivel ? (
          <EyeOff aria-hidden className="size-5" strokeWidth={1.5} />
        ) : (
          <Eye aria-hidden className="size-5" strokeWidth={1.5} />
        )}
      </button>
    </div>
  )
})

export default InputPassword
