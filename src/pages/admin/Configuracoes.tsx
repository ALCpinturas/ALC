import { Image, UserCog, Wrench } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import Cabecalho from '@/components/admin/Cabecalho'
import { cn } from '@/lib/cn'

/**
 * Configurações junta o que se define uma vez e raramente se mexe: o catálogo de trabalhos,
 * as fotografias do site e o acesso ao backoffice. Fora do caminho do dia a dia, que é
 * orçamentos e obras.
 */
const SEPARADORES = [
  { para: 'tipos-trabalho', rotulo: 'Tipos de trabalho', icone: Wrench },
  { para: 'imagens-site', rotulo: 'Imagens do site', icone: Image },
  { para: 'conta', rotulo: 'Conta', icone: UserCog },
] as const

export default function Configuracoes() {
  return (
    <>
      <Cabecalho
        titulo="Configurações"
        subtitulo="O catálogo de trabalhos, as fotografias do site público e o acesso ao backoffice."
        voltarPara="/admin"
      />

      <nav
        aria-label="Separadores das configurações"
        className="flex overflow-x-auto border-b border-alc-line bg-white px-2"
      >
        {SEPARADORES.map((separador) => (
          <NavLink
            key={separador.para}
            to={separador.para}
            className={({ isActive }) =>
              cn(
                'toque flex shrink-0 items-center gap-2 border-b-2 border-transparent px-4 text-sm text-alc-ink',
                isActive ? 'border-alc-rose-dark text-alc-black' : 'hover:text-alc-black',
              )
            }
          >
            <separador.icone aria-hidden className="size-4" strokeWidth={1.5} />
            {separador.rotulo}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </>
  )
}
