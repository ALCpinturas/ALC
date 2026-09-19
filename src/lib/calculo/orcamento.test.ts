import { describe, expect, it } from 'vitest'
import { totais, totalLinhaCentimos } from './orcamento'

describe('totalLinhaCentimos', () => {
  it('multiplica quantidade inteira por preço unitário', () => {
    expect(totalLinhaCentimos(3, 1250)).toBe(3750)
  })

  it('arredonda ao cêntimo com quantidade decimal', () => {
    // 12,35 × 8,99 € = 111,0265 €, ou seja 11102,65 cêntimos, que arredonda para cima.
    expect(totalLinhaCentimos(12.35, 899)).toBe(11103)
  })

  it('devolve zero com quantidade zero', () => {
    expect(totalLinhaCentimos(0, 999999)).toBe(0)
  })

  it('não é afetado pela imprecisão de vírgula flutuante', () => {
    // 0,1 + 0,2 em euros parte mal; em cêntimos inteiros não.
    expect(totalLinhaCentimos(0.1, 1000) + totalLinhaCentimos(0.2, 1000)).toBe(300)
  })

  it('a soma de linhas repetidas bate certo ao cêntimo', () => {
    const linhas = Array.from({ length: 10 }, () => totalLinhaCentimos(1.115, 100))
    expect(linhas.reduce((a, b) => a + b, 0)).toBe(1120)
  })
})

describe('totais', () => {
  const linhas = [
    { quantidade: 42.5, preco_unitario_cents: 1250 },
    { quantidade: 18.75, preco_unitario_cents: 3490 },
    { quantidade: 1, preco_unitario_cents: 15000 },
  ]

  it('soma o subtotal a partir das linhas', () => {
    expect(totais(linhas, 0, 0).subtotal_cents).toBe(53125 + 65438 + 15000)
  })

  it('aplica IVA de 23 por cento sobre a incidência', () => {
    const resultado = totais([{ quantidade: 1, preco_unitario_cents: 10000 }], 0, 23)
    expect(resultado.iva_cents).toBe(2300)
    expect(resultado.total_cents).toBe(12300)
  })

  it('aplica IVA de 6 por cento', () => {
    const resultado = totais([{ quantidade: 1, preco_unitario_cents: 10000 }], 0, 6)
    expect(resultado.iva_cents).toBe(600)
    expect(resultado.total_cents).toBe(10600)
  })

  it('limita o desconto ao subtotal em vez de gerar total negativo', () => {
    const resultado = totais([{ quantidade: 1, preco_unitario_cents: 5000 }], 900000, 23)
    expect(resultado.desconto_cents).toBe(5000)
    expect(resultado.incidencia_cents).toBe(0)
    expect(resultado.total_cents).toBe(0)
  })

  it('com taxa de IVA a zero o total iguala a incidência', () => {
    const resultado = totais(linhas, 1000, 0)
    expect(resultado.iva_cents).toBe(0)
    expect(resultado.total_cents).toBe(resultado.incidencia_cents)
  })

  it('sem linhas devolve tudo a zero', () => {
    expect(totais([], 5000, 23)).toEqual({
      subtotal_cents: 0,
      desconto_cents: 0,
      incidencia_cents: 0,
      iva_cents: 0,
      total_cents: 0,
    })
  })
})
