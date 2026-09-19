import { escaparHtml } from './format.ts'

const PRETO = '#1A1A1A'
const CINZA = '#ECEBE9'
const ROSA_ESCURO = '#7A4F42'

export interface Contactos {
  nome: string
  morada: string
  codigoPostal: string
  localidade: string
  telefone: string
}

interface Bloco {
  rotulo: string
  valor: string
}

function moldura(titulo: string, corpo: string, contactos: Contactos): string {
  return `<!doctype html>
<html lang="pt-PT">
<body style="margin:0;padding:0;background:${CINZA};font-family:Helvetica,Arial,sans-serif;color:${PRETO};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CINZA};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;">
      <tr><td style="padding:24px 24px 8px 24px;border-bottom:1px solid ${CINZA};">
        <span style="font-size:22px;letter-spacing:0.2em;text-transform:uppercase;">ALC</span>
      </td></tr>
      <tr><td style="padding:24px;">
        <h1 style="margin:0 0 16px 0;font-size:18px;font-weight:normal;color:${PRETO};">${escaparHtml(titulo)}</h1>
        ${corpo}
      </td></tr>
      <tr><td style="padding:16px 24px 24px 24px;border-top:1px solid ${CINZA};font-size:12px;color:#4A4441;">
        ${escaparHtml(contactos.nome)}<br>
        ${escaparHtml(contactos.morada)}, ${escaparHtml(contactos.codigoPostal)} ${escaparHtml(contactos.localidade)}<br>
        ${escaparHtml(contactos.telefone)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function tabela(blocos: Bloco[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
    ${blocos
      .map(
        (bloco) => `<tr>
      <td style="padding:6px 0;color:#4A4441;width:40%;vertical-align:top;">${escaparHtml(bloco.rotulo)}</td>
      <td style="padding:6px 0;vertical-align:top;">${escaparHtml(bloco.valor)}</td>
    </tr>`,
      )
      .join('')}
  </table>`
}

export function emailNotificacaoInterna(
  titulo: string,
  blocos: Bloco[],
  ligacao: string,
  contactos: Contactos,
): { html: string; texto: string } {
  const corpo = `${tabela(blocos)}
    <p style="margin:24px 0 0 0;"><a href="${ligacao}" style="color:${ROSA_ESCURO};">Abrir no backoffice</a></p>`

  const texto = [
    titulo,
    '',
    ...blocos.map((bloco) => `${bloco.rotulo}: ${bloco.valor}`),
    '',
    `Backoffice: ${ligacao}`,
  ].join('\n')

  return { html: moldura(titulo, corpo, contactos), texto }
}

export function emailConfirmacaoCliente(
  nome: string,
  blocos: Bloco[],
  contactos: Contactos,
): { html: string; texto: string } {
  const titulo = 'Recebemos o seu pedido, ALC'
  const corpo = `<p style="margin:0 0 16px 0;font-size:14px;">${escaparHtml(nome)}, recebemos o seu pedido. Vamos analisá-lo e entramos em contacto consigo assim que possível com orçamentos.</p>
    ${tabela(blocos)}
    <p style="margin:24px 0 0 0;font-size:14px;">Se precisar de falar connosco antes disso, use os contactos abaixo.</p>`

  const texto = [
    `${nome}, recebemos o seu pedido. Vamos analisá-lo e entramos em contacto consigo assim que possível com orçamentos.`,
    '',
    ...blocos.map((bloco) => `${bloco.rotulo}: ${bloco.valor}`),
    '',
    `${contactos.nome} · ${contactos.telefone}`,
  ].join('\n')

  return { html: moldura(titulo, corpo, contactos), texto }
}

export function emailOrcamento(
  nome: string,
  numero: string,
  total: string,
  validadeDias: number,
  ligacao: string,
  contactos: Contactos,
): { html: string; texto: string } {
  const titulo = `Orçamento ALC ${numero}`
  const corpo = `<p style="margin:0 0 16px 0;font-size:14px;">${escaparHtml(nome)}, segue o orçamento que preparámos para a sua obra.</p>
    ${tabela([
      { rotulo: 'Número', valor: numero },
      { rotulo: 'Total', valor: total },
      { rotulo: 'Validade', valor: `${validadeDias} dias` },
    ])}
    <p style="margin:24px 0 0 0;font-size:14px;"><a href="${ligacao}" style="color:${ROSA_ESCURO};">Descarregar o orçamento em PDF</a></p>
    <p style="margin:8px 0 0 0;font-size:12px;color:#4A4441;">A ligação é pessoal e expira dentro de sete dias.</p>`

  const texto = [
    `${nome}, segue o orçamento que preparámos para a sua obra.`,
    '',
    `Número: ${numero}`,
    `Total: ${total}`,
    `Validade: ${validadeDias} dias`,
    '',
    `PDF (a ligação expira dentro de sete dias): ${ligacao}`,
  ].join('\n')

  return { html: moldura(titulo, corpo, contactos), texto }
}
