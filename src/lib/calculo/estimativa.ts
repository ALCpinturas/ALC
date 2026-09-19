/** Estimativa pública da calculadora. Resultado em cêntimos, arredondado às centenas de euros. */

export interface PrecoUnitario {
  chave: string
  preco_min_cents: number
  preco_max_cents: number
}

export interface EntradaEstimativa {
  area_m2: number
  trabalhos: readonly string[]
  multiplicador: number
  precos: readonly PrecoUnitario[]
}

export interface FaixaEstimativa {
  min_cents: number
  max_cents: number
  semPrecos: boolean
}

const CENTIMOS_POR_CENTENA = 100 * 100

function arredondarACentena(centimos: number): number {
  return Math.round(centimos / CENTIMOS_POR_CENTENA) * CENTIMOS_POR_CENTENA
}

export function calcularEstimativa(entrada: EntradaEstimativa): FaixaEstimativa {
  const area = Number.isFinite(entrada.area_m2) ? Math.max(0, entrada.area_m2) : 0
  const multiplicador = Number.isFinite(entrada.multiplicador) ? entrada.multiplicador : 1
  const areaMilesimos = Math.round(area * 1000)

  let min = 0
  let max = 0
  let algumPrecoDefinido = false

  for (const chave of entrada.trabalhos) {
    const preco = entrada.precos.find((item) => item.chave === chave)
    if (!preco) continue
    if (preco.preco_min_cents > 0 || preco.preco_max_cents > 0) algumPrecoDefinido = true
    min += Math.round((areaMilesimos * preco.preco_min_cents) / 1000)
    max += Math.round((areaMilesimos * preco.preco_max_cents) / 1000)
  }

  const multiplicadorMilesimos = Math.round(multiplicador * 1000)
  min = Math.round((min * multiplicadorMilesimos) / 1000)
  max = Math.round((max * multiplicadorMilesimos) / 1000)

  return {
    min_cents: arredondarACentena(min),
    max_cents: arredondarACentena(max),
    semPrecos: entrada.trabalhos.length === 0 || !algumPrecoDefinido,
  }
}
