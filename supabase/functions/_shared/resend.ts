export interface ResultadoEnvio {
  ok: boolean
  id?: string
  erro?: string
}

export async function enviarEmail(parametros: {
  para: string
  assunto: string
  html: string
  texto: string
}): Promise<ResultadoEnvio> {
  const chave = Deno.env.get('RESEND_API_KEY')
  const remetente = Deno.env.get('ALC_EMAIL_REMETENTE')

  if (!chave || !remetente) {
    return { ok: false, erro: 'RESEND_API_KEY ou ALC_EMAIL_REMETENTE em falta.' }
  }

  try {
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: remetente,
        to: [parametros.para],
        subject: parametros.assunto,
        html: parametros.html,
        text: parametros.texto,
      }),
    })

    if (!resposta.ok) {
      const corpo = await resposta.text()
      return { ok: false, erro: `Resend devolveu ${resposta.status}: ${corpo.slice(0, 300)}` }
    }

    const dados = (await resposta.json()) as { id?: string }
    return { ok: true, id: dados.id }
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : 'Falha de rede.' }
  }
}
