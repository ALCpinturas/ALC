import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EstadoVazio } from '@/components/ui/Estados'
import { useObrasPublicas } from '@/lib/hooks/useObrasPublicas'
import Seccao from './Seccao'

interface Par {
  obra: string
  antes: string
  depois: string
}

export default function AntesDepois() {
  const { obras, aCarregar } = useObrasPublicas()
  const [posicao, setPosicao] = useState(50)
  const [aArrastar, setAArrastar] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)

  const par = useMemo<Par | null>(() => {
    for (const obra of obras) {
      const antes = obra.imagens.find((imagem) => imagem.categoria === 'antes')
      const depois = obra.imagens.find((imagem) => imagem.categoria === 'depois')
      if (antes && depois) return { obra: obra.titulo, antes: antes.url, depois: depois.url }
    }
    return null
  }, [obras])

  const mover = useCallback((clienteX: number) => {
    const area = areaRef.current
    if (!area) return
    const caixa = area.getBoundingClientRect()
    const percentagem = ((clienteX - caixa.left) / caixa.width) * 100
    setPosicao(Math.min(100, Math.max(0, percentagem)))
  }, [])

  useEffect(() => {
    if (!aArrastar) return
    const aoMoverRato = (evento: MouseEvent) => mover(evento.clientX)
    const aoMoverToque = (evento: TouchEvent) => {
      const toque = evento.touches[0]
      if (toque) mover(toque.clientX)
    }
    const terminar = () => setAArrastar(false)

    window.addEventListener('mousemove', aoMoverRato)
    window.addEventListener('touchmove', aoMoverToque, { passive: true })
    window.addEventListener('mouseup', terminar)
    window.addEventListener('touchend', terminar)
    return () => {
      window.removeEventListener('mousemove', aoMoverRato)
      window.removeEventListener('touchmove', aoMoverToque)
      window.removeEventListener('mouseup', terminar)
      window.removeEventListener('touchend', terminar)
    }
  }, [aArrastar, mover])

  if (aCarregar) return null

  return (
    <Seccao
      id="antes-depois"
      fundo="cinza"
      titulo="Veja a diferença"
      subtitulo="Uma boa remodelação não precisa de transformar tudo. Muitas vezes, são as escolhas certas que fazem toda a diferença."
    >
      {!par ? (
        <EstadoVazio
          titulo="Ainda não há pares de fotografias antes e depois."
          descricao="Assim que uma obra tiver as duas fases publicadas, o comparador aparece aqui."
        />
      ) : (
        <div
          ref={areaRef}
          className="relative aspect-[16/10] w-full select-none overflow-hidden bg-alc-black"
          onMouseDown={(evento) => {
            setAArrastar(true)
            mover(evento.clientX)
          }}
          onTouchStart={(evento) => {
            setAArrastar(true)
            const toque = evento.touches[0]
            if (toque) mover(toque.clientX)
          }}
        >
          <img
            src={par.depois}
            alt={`${par.obra}, depois da intervenção`}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${posicao}%` }}
            aria-hidden
          >
            <img
              src={par.antes}
              alt=""
              className="absolute inset-0 h-full w-[100vw] max-w-none object-cover"
              style={{ width: areaRef.current?.clientWidth ?? '100%' }}
              loading="lazy"
              decoding="async"
            />
          </div>

          <span className="pointer-events-none absolute left-3 top-3 bg-alc-black/80 px-2 py-1 text-xs uppercase tracking-wider text-white">
            Antes
          </span>
          <span className="pointer-events-none absolute right-3 top-3 bg-alc-black/80 px-2 py-1 text-xs uppercase tracking-wider text-white">
            Depois
          </span>

          <div
            className="absolute inset-y-0 w-0.5 bg-white"
            style={{ left: `${posicao}%` }}
            aria-hidden
          />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(posicao)}
            onChange={(evento) => setPosicao(Number(evento.target.value))}
            aria-label="Comparar antes e depois"
            className="absolute inset-x-0 bottom-4 mx-auto w-[calc(100%-2rem)] cursor-ew-resize accent-alc-rose-dark"
          />
        </div>
      )}
    </Seccao>
  )
}
