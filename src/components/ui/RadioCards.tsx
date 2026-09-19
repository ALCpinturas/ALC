import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '@/lib/cn'

export interface OpcaoRadio {
  valor: string
  rotulo: string
  descricao?: string
}

interface RadioCardsProps {
  valor: string
  aoMudar: (valor: string) => void
  opcoes: readonly OpcaoRadio[]
  colunas?: 1 | 2
  rotuloGrupo: string
}

/** Cartões grandes em vez de círculos pequenos: é isto que se toca no telemóvel. */
export default function RadioCards({
  valor,
  aoMudar,
  opcoes,
  colunas = 1,
  rotuloGrupo,
}: RadioCardsProps) {
  return (
    <RadioGroupPrimitive.Root
      value={valor}
      onValueChange={aoMudar}
      aria-label={rotuloGrupo}
      className={cn('grid gap-3', colunas === 2 ? 'sm:grid-cols-2' : '')}
    >
      {opcoes.map((opcao) => (
        <RadioGroupPrimitive.Item
          key={opcao.valor}
          value={opcao.valor}
          className={cn(
            'toque flex flex-col items-start rounded-[2px] border p-4 text-left transition-colors',
            'border-alc-line bg-white hover:border-alc-rose-dark',
            'data-[state=checked]:border-alc-rose-dark data-[state=checked]:bg-alc-rose-light',
          )}
        >
          <span className="font-medium text-alc-black">{opcao.rotulo}</span>
          {opcao.descricao ? (
            <span className="mt-1 text-sm text-alc-ink">{opcao.descricao}</span>
          ) : null}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  )
}
