/**
 * Medições. Entrada sempre em centímetros inteiros, saída em m² ou metros lineares
 * arredondada a duas casas. Nenhuma destas funções toca na base de dados.
 */

export interface Vao {
  tipo: 'porta' | 'janela' | 'abertura'
  largura_cm: number
  altura_cm: number
  quantidade: number
}

export interface Divisao {
  comprimento_cm: number
  largura_cm: number
  pe_direito_cm: number
  vaos: Vao[]
}

function arredondar2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

export function areaPavimento(comprimento_cm: number, largura_cm: number): number {
  return arredondar2((comprimento_cm / 100) * (largura_cm / 100))
}

export function areaTeto(comprimento_cm: number, largura_cm: number): number {
  return areaPavimento(comprimento_cm, largura_cm)
}

export function perimetro(comprimento_cm: number, largura_cm: number): number {
  return arredondar2((2 * (comprimento_cm + largura_cm)) / 100)
}

export function areaVaos(vaos: Vao[]): number {
  const total = vaos.reduce(
    (acumulado, vao) =>
      acumulado + (vao.largura_cm / 100) * (vao.altura_cm / 100) * Math.max(0, vao.quantidade),
    0,
  )
  return arredondar2(total)
}

export function areaParedes(divisao: Divisao): number {
  const bruta = perimetro(divisao.comprimento_cm, divisao.largura_cm) * (divisao.pe_direito_cm / 100)
  const liquida = bruta - areaVaos(divisao.vaos)
  return arredondar2(Math.max(0, liquida))
}

export function metrosLinearesRodape(divisao: Divisao): number {
  const portas = divisao.vaos
    .filter((vao) => vao.tipo === 'porta' || vao.tipo === 'abertura')
    .reduce((acumulado, vao) => acumulado + (vao.largura_cm / 100) * Math.max(0, vao.quantidade), 0)
  const total = perimetro(divisao.comprimento_cm, divisao.largura_cm) - portas
  return arredondar2(Math.max(0, total))
}

export interface ResumoDivisao {
  pavimento: number
  teto: number
  paredes: number
  perimetro: number
  rodape: number
}

export function resumoDivisao(divisao: Divisao): ResumoDivisao {
  return {
    pavimento: areaPavimento(divisao.comprimento_cm, divisao.largura_cm),
    teto: areaTeto(divisao.comprimento_cm, divisao.largura_cm),
    paredes: areaParedes(divisao),
    perimetro: perimetro(divisao.comprimento_cm, divisao.largura_cm),
    rodape: metrosLinearesRodape(divisao),
  }
}
