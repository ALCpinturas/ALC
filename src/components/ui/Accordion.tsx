import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'

export interface ItemAcordeao {
  id: string
  pergunta: string
  resposta: string
}

interface AccordionProps {
  itens: readonly ItemAcordeao[]
}

export default function Accordion({ itens }: AccordionProps) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="divide-y divide-alc-line border-y border-alc-line">
      {itens.map((item) => (
        <AccordionPrimitive.Item key={item.id} value={item.id}>
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 py-5 text-left">
              <span className="font-display text-lg text-alc-black">{item.pergunta}</span>
              <Plus
                aria-hidden
                className="size-5 shrink-0 text-alc-rose-dark transition-transform group-data-[state=open]:rotate-45"
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden">
            <p className="pb-5 pr-9 text-alc-ink">{item.resposta}</p>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}
