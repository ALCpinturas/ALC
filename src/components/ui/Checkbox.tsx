import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CheckboxProps {
  marcado: boolean
  aoMudar: (marcado: boolean) => void
  children: ReactNode
  invalido?: boolean
  className?: string
}

export default function Checkbox({
  marcado,
  aoMudar,
  children,
  invalido = false,
  className,
}: CheckboxProps) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <CheckboxPrimitive.Root
        id={id}
        checked={marcado}
        onCheckedChange={(estado) => aoMudar(estado === true)}
        aria-invalid={invalido || undefined}
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[2px] border bg-white',
          'data-[state=checked]:border-alc-rose-dark data-[state=checked]:bg-alc-rose-dark',
          invalido ? 'border-alc-rose-deep' : 'border-alc-line',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden className="size-4 text-white" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={id} className="text-sm leading-relaxed text-alc-black">
        {children}
      </label>
    </div>
  )
}
