import { Building2, FileText, Images, LayoutDashboard, LogOut, ReceiptEuro, Settings, Users } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import Logo from '@/components/site/Logo'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'

const NAVEGACAO = [
  { para: '/admin', rotulo: 'Início', icone: LayoutDashboard, exato: true },
  { para: '/admin/orcamentos', rotulo: 'Orçamentos', icone: ReceiptEuro, exato: false },
  { para: '/admin/leads', rotulo: 'Leads', icone: FileText, exato: false },
  { para: '/admin/clientes', rotulo: 'Clientes', icone: Users, exato: false },
  { para: '/admin/obras', rotulo: 'Obras', icone: Building2, exato: false },
  { para: '/admin/portefolio', rotulo: 'Portefólio', icone: Images, exato: false },
  { para: '/admin/configuracoes', rotulo: 'Config.', icone: Settings, exato: false },
] as const

/**
 * A barra de navegação fica em baixo no telemóvel, ao alcance do polegar: este backoffice
 * é usado no estaleiro, de pé, com uma mão. Em ecrã largo passa a barra lateral.
 */
export default function Layout() {
  const { perfil, sair } = useAuth()
  const navegar = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col bg-alc-grey md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-alc-line bg-white md:flex">
        <div className="border-b border-alc-line px-4 py-4">
          <Logo variante="monograma" altura={36} prioritario />
        </div>
        <nav aria-label="Navegação do backoffice" className="flex-1 p-2">
          {NAVEGACAO.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.exato}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[2px] px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-alc-rose-light text-alc-black' : 'text-alc-ink hover:bg-alc-grey',
                )
              }
            >
              <item.icone aria-hidden className="size-5" strokeWidth={1.5} />
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-alc-line p-3">
          <p className="truncate px-1 text-sm font-medium text-alc-black">{perfil?.nome ?? '—'}</p>
          <p className="px-1 text-xs uppercase tracking-wide text-alc-ink">{perfil?.papel ?? ''}</p>
          <button
            type="button"
            onClick={() => {
              void sair().then(() => navegar('/admin/login', { replace: true }))
            }}
            className="mt-2 flex w-full items-center gap-2 rounded-[2px] px-1 py-2 text-sm text-alc-rose-deep hover:bg-alc-grey"
          >
            <LogOut aria-hidden className="size-4" />
            Sair
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-alc-line bg-white px-4 py-2 md:hidden">
        <Logo variante="monograma" altura={32} prioritario />
        <div className="flex items-center gap-3">
          <span className="max-w-32 truncate text-sm text-alc-ink">{perfil?.nome ?? ''}</span>
          <button
            type="button"
            aria-label="Sair"
            onClick={() => {
              void sair().then(() => navegar('/admin/login', { replace: true }))
            }}
            className="toque flex items-center justify-center text-alc-rose-deep"
          >
            <LogOut aria-hidden className="size-5" />
          </button>
        </div>
      </header>

      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>

      <nav
        aria-label="Navegação principal"
        className="safe-b fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-alc-line bg-white md:hidden"
      >
        {NAVEGACAO.map((item) => (
          <NavLink
            key={item.para}
            to={item.para}
            end={item.exato}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-center text-[11px] leading-tight',
                isActive ? 'text-alc-rose-deep' : 'text-alc-ink',
              )
            }
          >
            <item.icone aria-hidden className="size-5" strokeWidth={1.5} />
            {item.rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
