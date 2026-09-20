// Disparada por Database Webhook no INSERT em pedidos_contacto e em leads_calculadora.
// Envia a notificação interna e a confirmação ao cliente, uma única vez por registo.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { formatarDataHora, formatarEuros } from '../_shared/format.ts'
import {
  emailConfirmacaoCliente,
  emailNotificacaoInterna,
  type Contactos,
} from '../_shared/templates.ts'
import { enviarEmail } from '../_shared/resend.ts'

const CONTACTOS: Contactos = {
  nome: 'ALC, Alexandre Luís Carlitos',
  morada: 'Travessa Cruz das Almas, Ent. 4, 3.º',
  codigoPostal: '5000-507',
  localidade: 'Vila Real',
  telefone: '926 556 000',
}

/*
 * A notificação interna é obrigatória: todo o pedido que entra tem de chegar à caixa da
 * ALC. Por isso o endereço está aqui e não só num secret — se ALC_EMAIL_DESTINO faltar,
 * continua a sair email em vez de o pedido passar despercebido. O secret continua a
 * valer, para mudar de caixa sem publicar a função outra vez.
 */
const DESTINO_INTERNO = 'ALC.pinturas@proton.me'

interface PayloadWebhook {
  type: string
  table: string
  record: Record<string, unknown>
}

const ROTULO_TRABALHO: Record<string, string> = {
  pintura: 'Pintura',
  tetos_falsos: 'Tetos falsos',
  divisorias: 'Divisórias',
  pavimento: 'Pavimento',
  acabamentos: 'Acabamentos',
  remodelacao_geral: 'Remodelação geral',
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : String(valor ?? '—')
}

Deno.serve(async (pedido) => {
  if (pedido.method !== 'POST') return new Response('Método não permitido', { status: 405 })

  const segredo = Deno.env.get('WEBHOOK_SECRET')
  if (!segredo || pedido.headers.get('x-webhook-secret') !== segredo) {
    return new Response('Não autorizado', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  let payload: PayloadWebhook
  try {
    payload = (await pedido.json()) as PayloadWebhook
  } catch {
    return new Response('Corpo inválido', { status: 400 })
  }

  const registo = payload.record ?? {}
  const id = texto(registo.id)
  const daCalculadora = payload.table === 'leads_calculadora'
  const destinoInterno = Deno.env.get('ALC_EMAIL_DESTINO')?.trim() || DESTINO_INTERNO
  const urlBackoffice = `${Deno.env.get('SITE_URL') ?? ''}/admin/leads`

  const blocos = [
    { rotulo: 'Nome', valor: texto(registo.nome) },
    { rotulo: 'Telefone', valor: texto(registo.telefone) },
    { rotulo: 'Email', valor: texto(registo.email) },
    { rotulo: 'Localidade', valor: texto(registo.localidade) },
    { rotulo: 'Área', valor: registo.area_m2 ? `${registo.area_m2} m²` : '—' },
    { rotulo: 'Recebido', valor: formatarDataHora(texto(registo.criado_em)) },
  ]

  if (daCalculadora) {
    const trabalhos = Array.isArray(registo.trabalhos) ? (registo.trabalhos as string[]) : []
    blocos.push({
      rotulo: 'Trabalhos',
      valor: trabalhos.map((chave) => ROTULO_TRABALHO[chave] ?? chave).join(', ') || '—',
    })
  } else {
    blocos.push({ rotulo: 'Intervenção', valor: texto(registo.tipo_intervencao) })
    blocos.push({ rotulo: 'Mensagem', valor: texto(registo.mensagem) })
  }

  /* A calculadora deixou de mostrar valores ao visitante: a estimativa serve para a ALC
   * preparar a resposta e não pode voltar ao cliente por email, senão o site diz uma
   * coisa e a caixa de entrada diz outra. Só entra na notificação interna. */
  const blocosInternos = daCalculadora
    ? [
        ...blocos,
        {
          rotulo: 'Estimativa interna',
          valor: `${formatarEuros(Number(registo.valor_estimado_cents ?? 0))} (não mostrada ao cliente)`,
        },
      ]
    : blocos

  // Só um envio bem-sucedido tranca o reenvio. Uma tentativa falhada fica registada mas
  // deixa a porta aberta para repetir o webhook, em vez de perder a notificação para sempre.
  async function jaEnviado(tipo: string): Promise<boolean> {
    const { data } = await supabase
      .from('emails_enviados')
      .select('id')
      .eq('tipo', tipo)
      .eq('referencia_id', id)
      .eq('estado', 'enviado')
      .maybeSingle()
    return data !== null
  }

  async function registarEnvio(
    tipo: string,
    destinatario: string,
    resultado: { ok: boolean; id?: string; erro?: string },
  ) {
    if (!resultado.ok) {
      // Nunca registar o destinatário (dado pessoal) no log. Fica guardado, sem ser
      // impresso, na coluna "erro" de emails_enviados, acessível só com sessão.
      console.error(`Falha a enviar ${tipo} (${payload.table} ${id}): ${resultado.erro}`)
    }
    // upsert e não insert: o índice único é por (tipo, referencia_id), portanto uma
    // repetição depois de falhar tem de substituir a linha falhada.
    await supabase.from('emails_enviados').upsert(
      {
        tipo,
        destinatario,
        referencia_id: id,
        referencia_tabela: payload.table,
        estado: resultado.ok ? 'enviado' : 'falhado',
        resend_id: resultado.id ?? null,
        erro: resultado.erro ?? null,
      },
      { onConflict: 'tipo,referencia_id' },
    )
  }

  if (!(await jaEnviado('notificacao_interna'))) {
    const conteudo = emailNotificacaoInterna(
      daCalculadora ? 'Novo pedido de orçamento pela calculadora' : 'Novo pedido de orçamento',
      blocosInternos,
      urlBackoffice,
      CONTACTOS,
    )
    const resultado = await enviarEmail({
      para: destinoInterno,
      assunto: daCalculadora
        ? 'ALC, novo pedido de orçamento (calculadora)'
        : 'ALC, novo pedido de orçamento',
      html: conteudo.html,
      texto: conteudo.texto,
    })
    await registarEnvio('notificacao_interna', destinoInterno, resultado)
  }

  const emailCliente = texto(registo.email)
  if (emailCliente.includes('@') && !(await jaEnviado('confirmacao_cliente'))) {
    const conteudo = emailConfirmacaoCliente(texto(registo.nome), blocos, CONTACTOS)
    const resultado = await enviarEmail({
      para: emailCliente,
      assunto: 'Recebemos o seu pedido, ALC',
      html: conteudo.html,
      texto: conteudo.texto,
    })
    await registarEnvio('confirmacao_cliente', emailCliente, resultado)
  }

  // Devolve sempre 200 depois de registar: uma falha de email não pode pôr o webhook
  // do Supabase num ciclo de repetições.
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
