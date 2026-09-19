import { Navigate, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth'

export default function RotaProtegida({ children }: { children: ReactNode }) {
  const { sessao, aVerificar } = useAuth()
  const localizacao = useLocation()

  // Enquanto a sessão não está confirmada mostra-se o estado de espera,
  // nunca o conteúdo protegido, nem que seja por um instante.
  if (aVerificar) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-alc-grey">
        <p className="text-sm text-alc-ink">A verificar a sessão…</p>
      </div>
    )
  }

  if (!sessao) return <Navigate to="/admin/login" replace state={{ de: localizacao.pathname }} />

  return <>{children}</>
}
