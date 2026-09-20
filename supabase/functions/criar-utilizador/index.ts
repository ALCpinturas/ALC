// Cria uma conta de acesso ao backoffice (administrador ou equipa).
// Só um administrador pode chamar esta função: exige JWT de utilizador autenticado com
// papel 'admin' e usa a chave de serviço, que nunca pode ir para o código do cliente.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { cabecalhosCors } from '../_shared/cors.ts'

// Duplicado de src/lib/schemas/conta.ts de propósito: o Deno das Edge Functions não
// importa de src. Se mudar um dos lados, mude o outro.
const MINIMO_PALAVRA_PASSE = 10
const PAPEIS = ['admin', 'equipa'] as const
type Papel = (typeof PAPEIS)[number]

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface PayloadPedido {
  nome?: string
  email?: string
  palavraPasse?: string
  papel?: string
}

Deno.serve(async (pedido) => {
  const cors = cabecalhosCors(pedido)

  function resposta(corpo: unknown, status: number): Response {
    return new Response(JSON.stringify(corpo), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (pedido.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (pedido.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405)

  const autorizacao = pedido.headers.get('Authorization')
  if (!autorizacao) return resposta({ erro: 'Sessão em falta.' }, 401)

  const comSessao = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: autorizacao } } },
  )

  const { data: utilizador } = await comSessao.auth.getUser()
  if (!utilizador.user) return resposta({ erro: 'Sessão inválida.' }, 401)

  const { data: perfil } = await comSessao
    .from('perfis')
    .select('papel')
    .eq('id', utilizador.user.id)
    .maybeSingle()

  if (perfil?.papel !== 'admin') {
    return resposta({ erro: 'Só um administrador pode criar contas.' }, 403)
  }

  let corpo: PayloadPedido
  try {
    corpo = (await pedido.json()) as PayloadPedido
  } catch {
    return resposta({ erro: 'Corpo inválido.' }, 400)
  }

  const nome = corpo.nome?.trim() ?? ''
  const email = corpo.email?.trim().toLowerCase() ?? ''
  const palavraPasse = corpo.palavraPasse ?? ''
  const papel = corpo.papel

  if (nome.length < 2) return resposta({ erro: 'Indique o nome da pessoa.' }, 400)
  if (!REGEX_EMAIL.test(email)) return resposta({ erro: 'O email indicado não é válido.' }, 400)
  if (palavraPasse.length < MINIMO_PALAVRA_PASSE) {
    return resposta(
      { erro: `A palavra-passe tem de ter pelo menos ${MINIMO_PALAVRA_PASSE} caracteres.` },
      400,
    )
  }
  if (!papel || !PAPEIS.includes(papel as Papel)) {
    return resposta({ erro: 'Escolha um papel válido.' }, 400)
  }

  const servico = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: criado, error: erroCriacao } = await servico.auth.admin.createUser({
    email,
    password: palavraPasse,
    email_confirm: true,
    user_metadata: { nome },
  })

  if (erroCriacao || !criado.user) {
    const jaExiste = /already.*registered|already.*exists/i.test(erroCriacao?.message ?? '')
    return resposta(
      { erro: jaExiste ? 'Já existe uma conta com este email.' : 'Não foi possível criar a conta.' },
      jaExiste ? 409 : 500,
    )
  }

  // O trigger ao_criar_utilizador já criou o perfil com papel 'equipa' por omissão.
  // Corrige para o papel pedido quando for diferente.
  const { error: erroPerfil } = await servico
    .from('perfis')
    .update({ papel })
    .eq('id', criado.user.id)

  if (erroPerfil) {
    return resposta(
      { erro: 'A conta foi criada mas não foi possível definir o papel. Ajuste-o em Configurações → Conta.' },
      500,
    )
  }

  return resposta({ ok: true }, 200)
})
