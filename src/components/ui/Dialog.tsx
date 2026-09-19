import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface DialogProps {
  aberto: boolean
  aoMudar: (aberto: boolean) => void
  titulo: string
  descricao?: string
  children: ReactNode
  rodape?: ReactNode
  /** Em telemóvel sobe de baixo e ocupa quase todo o ecrã. */
  folha?: boolean
  largura?: 'sm' | 'md' | 'lg' | 'cheio'
}

const LARGURAS: Record<NonNullable<DialogProps['largura']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  cheio: 'sm:max-w-5xl',
}

export default function Dialog({
  aberto,
  aoMudar,
  titulo,
  descricao,
  children,
  rodape,
  folha = true,
  largura = 'md',
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={aoMudar}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-alc-black/50" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col bg-white shadow-xl focus:outline-none sm:w-full',
            folha
              ? 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-none'
              : 'left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2',
            LARGURAS[largura],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-alc-line px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-xl text-alc-black">
                {titulo}
              </DialogPrimitive.Title>
              {descricao ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-alc-ink">
                  {descricao}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="toque -mr-2 -mt-2 flex items-center justify-center rounded-[2px] text-alc-ink hover:bg-alc-grey"
            >
              <X aria-hidden className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
          {rodape ? (
            <div className="safe-b flex flex-wrap justify-end gap-2 border-t border-alc-line px-4 py-3 sm:px-6">
              {rodape}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
