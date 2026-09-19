import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Input from '@/components/ui/Input'
import Logo from '@/components/site/Logo'
import { useAuth } from '@/lib/auth'
import { useSeo } from '@/lib/useSeo'

export default function Login() {
  const { entrar, sessao, aVerificar } = useAuth()
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [palavraPasse, setPalavraPasse] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aEntrar, setAEntrar] = useState(false)

  useSeo({
    titulo: 'Entrar — ALC',
    descricao: 'Área reservada da ALC.',
    naoIndexar: true,
  })

  if (!aVerificar && sessao) return <Navigate to="/admin" replace />

  async function submeter() {
    setErro(null)
    setAEntrar(true)
    const resultado = await entrar(email.trim(), palavraPasse)
    setAEntrar(false)
    if (!resultado.ok) {
      setErro(resultado.erro ?? 'Não foi possível entrar.')
      return
    }
    void navegar('/admin', { replace: true })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-alc-grey px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo variante="lockup" altura={80} prioritario />
        </div>

        <form
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault()
            void submeter()
          }}
          className="space-y-5 border border-alc-line bg-white p-6"
        >
          <h1 className="font-display text-2xl text-alc-black">Área reservada</h1>

          <Campo etiqueta="Email" obrigatorio>
            <Input
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />
          </Campo>

          <Campo etiqueta="Palavra-passe" obrigatorio>
            <Input
              type="password"
              autoComplete="current-password"
              value={palavraPasse}
              onChange={(evento) => setPalavraPasse(evento.target.value)}
            />
          </Campo>

          {erro ? (
            <p role="alert" className="text-sm font-medium text-alc-rose-deep">
              {erro}
            </p>
          ) : null}

          <Button type="submit" tamanho="lg" ocupado={aEntrar} className="w-full">
            Entrar
          </Button>

          <p className="text-sm text-alc-ink">
            As contas são criadas pela ALC. Não existe registo público.
          </p>
        </form>
      </div>
    </main>
  )
}
