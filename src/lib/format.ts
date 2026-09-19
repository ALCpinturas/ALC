const TZ = 'Europe/Lisbon'

const eur = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numero2 = new Intl.NumberFormat('pt-PT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Todos os valores monetários circulam em cêntimos inteiros. A divisão só acontece aqui. */
export function formatarEuros(centimos: number): string {
  if (!Number.isFinite(centimos)) return eur.format(0)
  return eur.format(Math.round(centimos) / 100)
}

export function formatarNumero(valor: number, casas = 2): string {
  if (casas === 2) return numero2.format(valor)
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor)
}

/** Aceita "1.234,56", "1234,56" e "1234.56". Devolve null se não for um número válido. */
export function parseEurosParaCentimos(texto: string): number | null {
  const limpo = texto.replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (limpo === '' || !/^-?\d*(\.\d*)?$/.test(limpo)) return null
  const valor = Number(limpo)
  if (!Number.isFinite(valor)) return null
  return Math.round(valor * 100)
}

export function centimosParaInput(centimos: number): string {
  return (Math.round(centimos) / 100).toFixed(2).replace('.', ',')
}

export function parseQuantidade(texto: string): number | null {
  const limpo = texto.replace(/\s/g, '').replace(',', '.')
  if (limpo === '' || !/^-?\d*(\.\d*)?$/.test(limpo)) return null
  const valor = Number(limpo)
  return Number.isFinite(valor) ? valor : null
}

function partesLisboa(data: Date): Record<string, string> {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(data)
  const saida: Record<string, string> = {}
  for (const parte of partes) if (parte.type !== 'literal') saida[parte.type] = parte.value
  return saida
}

function offsetLisboaMs(data: Date): number {
  const p = partesLisboa(data)
  const comoUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) === 24 ? 0 : Number(p.hour),
    Number(p.minute),
    Number(p.second),
  )
  // A formatação não devolve milissegundos: descontá-los do instante, senão o desvio
  // fica errado por essa fração e o fim do dia escorrega para o dia seguinte.
  return comoUTC - (data.getTime() - data.getMilliseconds())
}

/**
 * Converte uma hora de parede em Lisboa para o instante UTC correspondente.
 * Duas passagens, porque o desvio depende do próprio instante nos dias de mudança de hora.
 */
export function lisboaParaUTC(
  ano: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
  segundo = 0,
  ms = 0,
): Date {
  const alvo = Date.UTC(ano, mes - 1, dia, hora, minuto, segundo, ms)
  let instante = alvo - offsetLisboaMs(new Date(alvo))
  instante = alvo - offsetLisboaMs(new Date(instante))
  return new Date(instante)
}

function paraData(valor: string | Date | null | undefined): Date | null {
  if (!valor) return null
  const data = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

export function formatarData(valor: string | Date | null | undefined): string {
  const data = paraData(valor)
  if (!data) return '—'
  const p = partesLisboa(data)
  return `${p.day}/${p.month}/${p.year}`
}

export function formatarDataHora(valor: string | Date | null | undefined): string {
  const data = paraData(valor)
  if (!data) return '—'
  const p = partesLisboa(data)
  const hora = p.hour === '24' ? '00' : p.hour
  return `${p.day}/${p.month}/${p.year} ${hora}:${p.minute}`
}

/** Data em ISO curto na perspetiva de Lisboa, para campos <input type="date">. */
export function dataParaInput(valor: string | Date | null | undefined): string {
  const data = paraData(valor)
  if (!data) return ''
  const p = partesLisboa(data)
  return `${p.year}-${p.month}-${p.day}`
}

export function inicioDoDiaLisboa(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return lisboaParaUTC(ano ?? 1970, mes ?? 1, dia ?? 1, 0, 0, 0, 0)
}

export function fimDoDiaLisboa(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return lisboaParaUTC(ano ?? 1970, mes ?? 1, dia ?? 1, 23, 59, 59, 999)
}

export function formatarTelefone(valor: string | null | undefined): string {
  if (!valor) return '—'
  const digitos = valor.replace(/\D/g, '').replace(/^351/, '')
  if (digitos.length !== 9) return valor
  return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`
}

/** Primeiro nome, para tratar a pessoa pelo nome sem soar a formulário. */
export function primeiroNome(nome: string | null | undefined): string {
  if (!nome) return ''
  return nome.trim().split(/\s+/)[0] ?? ''
}

/** NIF em três grupos de três, como se escreve nos documentos. */
export function formatarNif(nif: string | null | undefined): string {
  if (!nif) return '—'
  const digitos = nif.replace(/\D/g, '')
  if (digitos.length !== 9) return nif
  return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`
}

export function formatarArea(m2: number | null | undefined): string {
  if (m2 === null || m2 === undefined) return '—'
  return `${formatarNumero(m2)} m²`
}
