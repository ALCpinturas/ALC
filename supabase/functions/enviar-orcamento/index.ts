// Envia ao cliente a ligação assinada para o PDF do orçamento. Nunca anexa o ficheiro.
// Exige JWT de utilizador autenticado: não é um endpoint público.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { formatarEuros } from '../_shared/format.ts'
import { emailOrcamento, type Contactos } from '../_shared/templates.ts'
import { enviarEmail } from '../_shared/resend.ts'
import { cabecalhosCors } from '../_shared/cors.ts'

const CONTACTOS: Contactos = {
  nome: 'ALC, Alexandre Luís Carlitos',
  morada: 'Travessa Cruz das Almas, Ent. 4, 3.º',
  codigoPostal: '5000-507',
  localidade: 'Vila Real',
  telefone: '926 556 000',
}

const VALIDADE_LIGACAO_SEGUNDOS = 7 * 24 * 60 * 60

/* Mesma lógica de notificar-lead/index.ts: a ALC tem de ficar sempre com cópia dos
 * orçamentos enviados, mesmo que ALC_EMAIL_DESTINO nunca chegue a ser definido. */
const DESTINO_INTERNO = 'ALC.pinturas@proton.me'

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
  if (!perfil) return resposta({ erro: 'Sem permissão.' }, 403)

  let corpo: { orcamento_id?: string; canal?: string }
  try {
    corpo = (await pedido.json()) as { orcamento_id?: string; canal?: string }
  } catch {
    return resposta({ erro: 'Corpo inválido.' }, 400)
  }

  const orcamentoId = corpo.orcamento_id
  if (!orcamentoId) return resposta({ erro: 'Falta o identificador do orçamento.' }, 400)

  const servico = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: orcamento } = await servico
    .from('orcamentos')
    .select('id, numero, versao, total_cents, validade_dias, pdf_path, cliente_id, estado')
    .eq('id', orcamentoId)
    .maybeSingle()

  if (!orcamento) return resposta({ erro: 'Orçamento não encontrado.' }, 404)
  if (!orcamento.pdf_path) return resposta({ erro: 'O orçamento ainda não foi emitido.' }, 409)

  const { data: cliente } = await servico
    .from('clientes')
    .select('nome, email')
    .eq('id', orcamento.cliente_id)
    .maybeSingle()

  if (!cliente) return resposta({ erro: 'Cliente não encontrado.' }, 404)

  const paraWhatsapp = corpo.canal === 'whatsapp'
  if (!paraWhatsapp && !cliente.email) {
    return resposta({ erro: 'O cliente não tem email registado.' }, 409)
  }

  const { data: assinada, error: erroAssinatura } = await servico.storage
    .from('orcamentos')
    .createSignedUrl(orcamento.pdf_path, VALIDADE_LIGACAO_SEGUNDOS)

  if (erroAssinatura || !assinada) {
    return resposta({ erro: 'Não foi possível preparar a ligação para o PDF.' }, 500)
  }

  // O WhatsApp não passa pelo Resend: só precisa da ligação assinada, que o browser usa
  // para compor a mensagem no wa.me. Não fica registado em emails_enviados, portanto não
  // interfere com o controlo de reenvio único do email.
  if (paraWhatsapp) {
    return resposta({ ok: true, url: assinada.signedUrl }, 200)
  }

  // Só um envio bem-sucedido tranca o reenvio: uma tentativa falhada (chave inválida,
  // CORS, rede) não pode fingir-se de "já enviado" para sempre.
  const { data: jaEnviado } = await servico
    .from('emails_enviados')
    .select('id')
    .eq('tipo', 'orcamento')
    .eq('referencia_id', orcamento.id)
    .eq('estado', 'enviado')
    .maybeSingle()

  if (jaEnviado) return resposta({ ok: true, repetido: true }, 200)

  const conteudo = emailOrcamento(
    cliente.nome,
    `${orcamento.numero} (versão ${orcamento.versao})`,
    formatarEuros(orcamento.total_cents),
    orcamento.validade_dias,
    assinada.signedUrl,
    CONTACTOS,
  )

  const destinoInterno = Deno.env.get('ALC_EMAIL_DESTINO')?.trim() || DESTINO_INTERNO

  const resultado = await enviarEmail({
    para: cliente.email,
    assunto: `Orçamento ALC ${orcamento.numero}`,
    html: conteudo.html,
    texto: conteudo.texto,
    bcc: destinoInterno,
  })

  // upsert e não insert: uma tentativa anterior falhada já deixou uma linha para
  // (tipo, referencia_id), e o reenvio tem de a substituir, não colidir com ela.
  await servico.from('emails_enviados').upsert(
    {
      tipo: 'orcamento',
      destinatario: cliente.email,
      referencia_id: orcamento.id,
      referencia_tabela: 'orcamentos',
      estado: resultado.ok ? 'enviado' : 'falhado',
      resend_id: resultado.id ?? null,
      erro: resultado.erro ?? null,
    },
    { onConflict: 'tipo,referencia_id' },
  )

  if (!resultado.ok) return resposta({ erro: 'O envio falhou. Tente novamente.' }, 502)

  return resposta({ ok: true }, 200)
})
