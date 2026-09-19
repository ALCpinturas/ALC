import { describe, expect, it } from 'vitest'
import { calcularEstimativa, type PrecoUnitario } from './estimativa'

const precos: PrecoUnitario[] = [
  { chave: 'pintura', preco_min_cents: 800, preco_max_cents: 1400 },
  { chave: 'pavimento', preco_min_cents: 2500, preco_max_cents: 4000 },
  { chave: 'acabamentos', preco_min_cents: 0, preco_max_cents: 0 },
]

describe('calcularEstimativa', () => {
  it('soma os trabalhos escolhidos e arredonda às centenas', () => {
    const resultado = calcularEstimativa({
      area_m2: 80,
      trabalhos: ['pintura', 'pavimento'],
      multiplicador: 1,
      precos,
    })
    // 80 × (8 + 25) = 2640 €, 80 × (14 + 40) = 4320 €
    expect(resultado.min_cents).toBe(260000)
    expect(resultado.max_cents).toBe(430000)
    expect(resultado.semPrecos).toBe(false)
  })

  it('aplica o multiplicador do estado do espaço', () => {
    const resultado = calcularEstimativa({
      area_m2: 100,
      trabalhos: ['pintura'],
      multiplicador: 1.35,
      precos,
    })
    // 100 × 8 € = 800 €, × 1,35 = 1080 € → 1100 €
    expect(resultado.min_cents).toBe(110000)
  })

  it('sinaliza preços por preencher em vez de inventar um número', () => {
    const resultado = calcularEstimativa({
      area_m2: 120,
      trabalhos: ['acabamentos'],
      multiplicador: 1,
      precos,
    })
    expect(resultado.min_cents).toBe(0)
    expect(resultado.max_cents).toBe(0)
    expect(resultado.semPrecos).toBe(true)
  })

  it('sem trabalhos selecionados devolve zero', () => {
    const resultado = calcularEstimativa({ area_m2: 90, trabalhos: [], multiplicador: 1, precos })
    expect(resultado.max_cents).toBe(0)
    expect(resultado.semPrecos).toBe(true)
  })

  it('ignora chaves desconhecidas', () => {
    const resultado = calcularEstimativa({
      area_m2: 50,
      trabalhos: ['inexistente'],
      multiplicador: 1,
      precos,
    })
    expect(resultado.max_cents).toBe(0)
  })
})
