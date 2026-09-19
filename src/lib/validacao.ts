/** Algoritmo de controlo do NIF português. */
export function nifValido(nif: string): boolean {
  const limpo = nif.replace(/\s/g, '')
  if (!/^\d{9}$/.test(limpo)) return false
  const primeiro = limpo[0]
  if (!primeiro || !'123456892'.includes(primeiro)) return false
  let soma = 0
  for (let i = 0; i < 8; i += 1) soma += Number(limpo[i]) * (9 - i)
  const resto = soma % 11
  const controlo = resto < 2 ? 0 : 11 - resto
  return controlo === Number(limpo[8])
}

/** Fixos e móveis portugueses, com ou sem +351. */
export const TELEFONE_PT = /^(?:\+351\s?)?(?:2\d|3[0-9]|9[1236])\d{7}$/

export function telefoneValido(valor: string): boolean {
  return TELEFONE_PT.test(valor.replace(/[\s.-]/g, ''))
}

export const CODIGO_POSTAL_PT = /^\d{4}-\d{3}$/

export function normalizarTelefone(valor: string): string {
  return valor.replace(/[\s.-]/g, '')
}
