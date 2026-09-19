import { useId, type ReactElement, cloneElement } from 'react'
import Label from './Label'
import { cn } from '@/lib/cn'

interface CampoProps {
  etiqueta: string
  erro?: string | undefined
  ajuda?: string
  obrigatorio?: boolean
  className?: string
  children: ReactElement<{ id?: string; invalido?: boolean; 'aria-describedby'?: string }>
}

/** Rótulo, campo e mensagem de erro ligados por id, para leitores de ecrã. */
export default function Campo({
  etiqueta,
  erro,
  ajuda,
  obrigatorio = false,
  className,
  children,
}: CampoProps) {
  const id = useId()
  const idErro = `${id}-erro`
  const idAjuda = `${id}-ajuda`
  const descrito = [erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(' ')

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {etiqueta}
        {obrigatorio ? <span className="text-alc-rose-dark"> *</span> : null}
      </Label>
      {cloneElement(children, {
        id,
        invalido: Boolean(erro),
        ...(descrito ? { 'aria-describedby': descrito } : {}),
      })}
      {ajuda ? (
        <p id={idAjuda} className="text-sm text-alc-ink">
          {ajuda}
        </p>
      ) : null}
      {erro ? (
        <p id={idErro} role="alert" className="text-sm font-medium text-alc-rose-deep">
          {erro}
        </p>
      ) : null}
    </div>
  )
}
