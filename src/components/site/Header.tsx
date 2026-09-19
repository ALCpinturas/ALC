import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Logo from './Logo'
import { cn } from '@/lib/cn'

const SECCOES = [
  { id: 'servicos', rotulo: 'Serviços' },
  { id: 'como-trabalhamos', rotulo: 'Como trabalhamos' },
  { id: 'portefolio', rotulo: 'Portefólio' },
  { id: 'estimativa', rotulo: 'Orçamento' },
  { id: 'sobre', rotulo: 'Sobre' },
  { id: 'contactos', rotulo: 'Contactos' },
] as const

export default function Header() {
  const [comScroll, setComScroll] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [ativa, setAtiva] = useState<string>('')

  useEffect(() => {
    const aoScroll = () => setComScroll(window.scrollY > 16)
    aoScroll()
    window.addEventListener('scroll', aoScroll, { passive: true })
    return () => window.removeEventListener('scroll', aoScroll)
  }, [])

  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) setAtiva(entrada.target.id)
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const seccao of SECCOES) {
      const elemento = document.getElementById(seccao.id)
      if (elemento) observador.observe(elemento)
    }
    return () => observador.disconnect()
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-200',
        comScroll ? 'bg-white/95 shadow-sm backdrop-blur-sm' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-20 md:px-6">
        <a href="#inicio" aria-label="ALC, início" className="flex items-center">
          <Logo variante="monograma" altura={44} prioritario className="md:hidden" />
          <Logo variante="monograma" altura={56} prioritario className="hidden md:block" />
        </a>

        <nav aria-label="Navegação principal" className="hidden items-center gap-6 lg:flex">
          {SECCOES.map((seccao) => (
            <a
              key={seccao.id}
              href={`#${seccao.id}`}
              aria-current={ativa === seccao.id ? 'true' : undefined}
              className={cn(
                'border-b-2 py-1 text-sm transition-colors',
                ativa === seccao.id
                  ? 'border-alc-rose-dark text-alc-black'
                  : 'border-transparent text-alc-ink hover:text-alc-black',
              )}
            >
              {seccao.rotulo}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild tamanho="sm" className="hidden sm:inline-flex">
            <a href="#contactos">Pedir orçamento</a>
          </Button>

          <DialogPrimitive.Root open={menuAberto} onOpenChange={setMenuAberto}>
            <DialogPrimitive.Trigger
              aria-label="Abrir menu"
              className="toque flex items-center justify-center rounded-[2px] text-alc-black lg:hidden"
            >
              <Menu aria-hidden className="size-6" />
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-alc-black/50" />
              <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-sm flex-col bg-white shadow-xl focus:outline-none">
                <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                <div className="flex items-center justify-between border-b border-alc-line px-4 py-3">
                  <Logo variante="monograma" altura={44} />
                  <DialogPrimitive.Close
                    aria-label="Fechar menu"
                    className="toque flex items-center justify-center rounded-[2px] text-alc-ink"
                  >
                    <X aria-hidden className="size-6" />
                  </DialogPrimitive.Close>
                </div>
                <nav aria-label="Navegação" className="flex flex-col p-2">
                  {SECCOES.map((seccao) => (
                    <a
                      key={seccao.id}
                      href={`#${seccao.id}`}
                      onClick={() => setMenuAberto(false)}
                      className="toque flex items-center border-b border-alc-line px-3 text-base text-alc-black last:border-0"
                    >
                      {seccao.rotulo}
                    </a>
                  ))}
                </nav>
                <div className="safe-b mt-auto p-4">
                  <Button asChild tamanho="lg" className="w-full">
                    <a href="#contactos" onClick={() => setMenuAberto(false)}>
                      Pedir orçamento
                    </a>
                  </Button>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </div>
    </header>
  )
}
