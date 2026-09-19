import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface OpcaoSelect {
  valor: string
  rotulo: string
}

interface SelectProps {
  valor: string
  aoMudar: (valor: string) => void
  opcoes: readonly OpcaoSelect[]
  marcador?: string
  id?: string
  invalido?: boolean
  className?: string
  desativado?: boolean
}

export default function Select({
  valor,
  aoMudar,
  opcoes,
  marcador = 'Selecione',
  id,
  invalido = false,
  className,
  desativado = false,
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={valor} onValueChange={aoMudar} disabled={desativado}>
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalido || undefined}
        className={cn(
          'flex h-12 w-full items-center justify-between gap-2 rounded-[2px] border bg-white px-3 text-left text-base',
          'data-[placeholder]:text-alc-ink/50 disabled:bg-alc-grey',
          invalido ? 'border-alc-rose-deep' : 'border-alc-line',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={marcador} />
        <SelectPrimitive.Icon>
          <ChevronDown aria-hidden className="size-4 text-alc-ink" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[2px] border border-alc-line bg-white shadow-lg"
        >
          <SelectPrimitive.Viewport className="p-1">
            {opcoes.map((opcao) => (
              <SelectPrimitive.Item
                key={opcao.valor}
                value={opcao.valor}
                className="flex min-h-11 cursor-pointer select-none items-center justify-between rounded-[2px] px-3 text-base outline-none data-[highlighted]:bg-alc-rose-light"
              >
                <SelectPrimitive.ItemText>{opcao.rotulo}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check aria-hidden className="size-4 text-alc-rose-dark" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
