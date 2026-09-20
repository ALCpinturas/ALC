/** Estimativa interna da calculadora. Nunca é mostrada ao visitante do site — serve só
 * para a ficha da lead, para a ALC preparar o contacto. Resultado em cêntimos, arredondado
 * às centenas de euros. */

export interface PrecoUnitario {
  chave: string
  preco_cents: number
}

export interface EntradaEstimativa {
  area_m2: number
  trabalhos: readonly string[]
  multiplicador: number
  precos: readonly PrecoUnitario[]
}

export interface Estimativa {
  valor_cents: number
  semPrecos: boolean
}

const CENTIMOS_POR_CENTENA = 100 * 100

function arredondarACentena(centimos: number): number {
  return Math.round(centimos / CENTIMOS_POR_CENTENA) * CENTIMOS_POR_CENTENA
}

export function calcularEstimativa(entrada: EntradaEstimativa): Estimativa {
  const area = Number.isFinite(entrada.area_m2) ? Math.max(0, entrada.area_m2) : 0
  const multiplicador = Number.isFinite(entrada.multiplicador) ? entrada.multiplicador : 1
  const areaMilesimos = Math.round(area * 1000)

  let total = 0
  let algumPrecoDefinido = false

  for (const chave of entrada.trabalhos) {
    const preco = entrada.precos.find((item) => item.chave === chave)
    if (!preco) continue
    if (preco.preco_cents > 0) algumPrecoDefinido = true
    total += Math.round((areaMilesimos * preco.preco_cents) / 1000)
  }

  const multiplicadorMilesimos = Math.round(multiplicador * 1000)
  total = Math.round((total * multiplicadorMilesimos) / 1000)

  return {
    valor_cents: arredondarACentena(total),
    semPrecos: entrada.trabalhos.length === 0 || !algumPrecoDefinido,
  }
}
