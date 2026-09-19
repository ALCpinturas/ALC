import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { PerfilRow } from '@/types/database'

interface ContextoAuth {
  sessao: Session | null
  perfil: PerfilRow | null
  aVerificar: boolean
  entrar: (email: string, palavraPasse: string) => Promise<{ ok: boolean; erro?: string }>
  sair: () => Promise<void>
}

const Contexto = createContext<ContextoAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<PerfilRow | null>(null)
  const [aVerificar, setAVerificar] = useState(true)

  useEffect(() => {
    let ativo = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      setAVerificar(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
    })

    return () => {
      ativo = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const utilizador = sessao?.user
    if (!utilizador) {
      setPerfil(null)
      return
    }
    let ativo = true
    void supabase
      .from('perfis')
      .select('*')
      .eq('id', utilizador.id)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setPerfil(data)
      })
    return () => {
      ativo = false
    }
  }, [sessao])

  const valor = useMemo<ContextoAuth>(
    () => ({
      sessao,
      perfil,
      aVerificar,
      entrar: async (email, palavraPasse) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password: palavraPasse })
        if (error) {
          // Sem distinguir email de palavra-passe, para não confirmar contas existentes.
          return { ok: false, erro: 'Os dados de acesso não estão corretos.' }
        }
        return { ok: true }
      },
      sair: async () => {
        await supabase.auth.signOut()
        setPerfil(null)
      },
    }),
    [aVerificar, perfil, sessao],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useAuth(): ContextoAuth {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useAuth tem de ser usado dentro de AuthProvider.')
  return contexto
}
