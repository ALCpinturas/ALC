/**
 * Motor de cálculo do orçamento. Tudo em cêntimos inteiros.
 * A quantidade é o único decimal e é convertida para milésimos antes de multiplicar,
 * para que a soma das linhas bata certo ao cêntimo.
 */

export interface LinhaCalculo {
  quantidade: number
  preco_unitario_cents: number
}

export interface Totais {
  subtotal_cents: number
  desconto_cents: number
  incidencia_cents: number
  iva_cents: number
  total_cents: number
}

export function totalLinhaCentimos(quantidade: number, preco_unitario_cents: number): number {
  if (!Number.isFinite(quantidade) || !Number.isFinite(preco_unitario_cents)) return 0
  const milesimos = Math.round(quantidade * 1000)
  const preco = Math.round(preco_unitario_cents)
  const produto = milesimos * preco
  // Arredondamento a meia unidade para cima, explícito, também para valores negativos.
  const sinal = produto < 0 ? -1 : 1
  return sinal * Math.round(Math.abs(produto) / 1000)
}

export function totais(
  linhas: readonly LinhaCalculo[],
  desconto_cents: number,
  iva_taxa: number,
): Totais {
  const subtotal = linhas.reduce(
    (acumulado, linha) => acumulado + totalLinhaCentimos(linha.quantidade, linha.preco_unitario_cents),
    0,
  )
  const descontoPedido = Math.max(0, Math.round(desconto_cents))
  const desconto = Math.min(descontoPedido, Math.max(0, subtotal))
  const incidencia = subtotal - desconto
  const taxa = Number.isFinite(iva_taxa) ? Math.max(0, iva_taxa) : 0
  const iva = Math.round((incidencia * taxa) / 100)
  return {
    subtotal_cents: subtotal,
    desconto_cents: desconto,
    incidencia_cents: incidencia,
    iva_cents: iva,
    total_cents: incidencia + iva,
  }
}

export const TAXAS_IVA = [6, 23] as const
export type TaxaIva = (typeof TAXAS_IVA)[number]

export const UNIDADES = ['m2', 'ml', 'un', 'vg'] as const
export type Unidade = (typeof UNIDADES)[number]

export const ROTULO_UNIDADE: Record<Unidade, string> = {
  m2: 'm²',
  ml: 'ml',
  un: 'un',
  vg: 'vg',
}
