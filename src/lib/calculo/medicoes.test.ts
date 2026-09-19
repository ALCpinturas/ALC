import { describe, expect, it } from 'vitest'
import {
  areaParedes,
  areaPavimento,
  areaVaos,
  metrosLinearesRodape,
  perimetro,
  resumoDivisao,
  type Divisao,
} from './medicoes'

const sala: Divisao = {
  comprimento_cm: 520,
  largura_cm: 380,
  pe_direito_cm: 260,
  vaos: [
    { tipo: 'porta', largura_cm: 80, altura_cm: 200, quantidade: 1 },
    { tipo: 'janela', largura_cm: 150, altura_cm: 120, quantidade: 2 },
  ],
}

describe('medições', () => {
  it('calcula a área de pavimento em m²', () => {
    expect(areaPavimento(520, 380)).toBe(19.76)
  })

  it('calcula o perímetro em metros lineares', () => {
    expect(perimetro(520, 380)).toBe(18)
  })

  it('soma a área dos vãos considerando a quantidade', () => {
    expect(areaVaos(sala.vaos)).toBe(1.6 + 3.6)
  })

  it('subtrai os vãos à área de paredes', () => {
    // 18 ml × 2,60 m = 46,80 m² menos 5,20 m² de vãos
    expect(areaParedes(sala)).toBe(41.6)
  })

  it('desconta a largura das portas ao rodapé mas não a das janelas', () => {
    expect(metrosLinearesRodape(sala)).toBe(17.2)
  })

  it('nunca devolve área negativa quando os vãos excedem a parede', () => {
    const exagero: Divisao = {
      comprimento_cm: 100,
      largura_cm: 100,
      pe_direito_cm: 200,
      vaos: [{ tipo: 'abertura', largura_cm: 400, altura_cm: 400, quantidade: 3 }],
    }
    expect(areaParedes(exagero)).toBe(0)
    expect(metrosLinearesRodape(exagero)).toBe(0)
  })

  it('o resumo devolve teto igual a pavimento', () => {
    const resumo = resumoDivisao(sala)
    expect(resumo.teto).toBe(resumo.pavimento)
  })
})
