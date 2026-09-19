// Duplicado de src/lib/format.ts de propósito: o Deno das Edge Functions não importa de src.
// Se mudar um dos lados, mude o outro.

const TZ = 'Europe/Lisbon'

const eur = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatarEuros(centimos: number): string {
  if (!Number.isFinite(centimos)) return eur.format(0)
  return eur.format(Math.round(centimos) / 100)
}

function partes(data: Date): Record<string, string> {
  const lista = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(data)
  const saida: Record<string, string> = {}
  for (const parte of lista) if (parte.type !== 'literal') saida[parte.type] = parte.value
  return saida
}

export function formatarData(valor: string | Date): string {
  const data = valor instanceof Date ? valor : new Date(valor)
  const p = partes(data)
  return `${p.day}/${p.month}/${p.year}`
}

export function formatarDataHora(valor: string | Date): string {
  const data = valor instanceof Date ? valor : new Date(valor)
  const p = partes(data)
  const hora = p.hour === '24' ? '00' : p.hour
  return `${p.day}/${p.month}/${p.year} ${hora}:${p.minute}`
}

export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
