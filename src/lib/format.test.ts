import { describe, expect, it } from 'vitest'
import {
  fimDoDiaLisboa,
  formatarData,
  formatarDataHora,
  formatarEuros,
  formatarNif,
  formatarTelefone,
  primeiroNome,
  inicioDoDiaLisboa,
  lisboaParaUTC,
  parseEurosParaCentimos,
} from './format'

const semEspacoFino = (texto: string) => texto.replace(/[\u00a0\u202f]/g, ' ')

describe('formatarEuros', () => {
  it('formata cêntimos em euros com convenção pt-PT', () => {
    expect(semEspacoFino(formatarEuros(123456))).toBe('1234,56 €')
  })

  it('formata zero', () => {
    expect(formatarEuros(0)).toContain('0,00')
  })

  it('usa vírgula decimal', () => {
    expect(formatarEuros(999)).toContain('9,99')
  })

  it('arredonda cêntimos fracionados em vez de os mostrar', () => {
    expect(formatarEuros(1050.4)).toContain('10,50')
  })
})

describe('parseEurosParaCentimos', () => {
  it('aceita vírgula decimal', () => {
    expect(parseEurosParaCentimos('1234,56')).toBe(123456)
  })

  it('aceita separador de milhares', () => {
    expect(parseEurosParaCentimos('1.234,56')).toBe(123456)
  })

  it('aceita ponto decimal', () => {
    expect(parseEurosParaCentimos('1234.56')).toBe(123456)
  })

  it('recusa texto', () => {
    expect(parseEurosParaCentimos('abc')).toBeNull()
  })

  it('recusa campo vazio', () => {
    expect(parseEurosParaCentimos('')).toBeNull()
  })
})

describe('datas em Europe/Lisbon', () => {
  it('formata em dd/mm/aaaa', () => {
    expect(formatarData('2026-03-14T23:30:00.000Z')).toBe('14/03/2026')
  })

  it('formata a hora em 24H sem AM nem PM', () => {
    const texto = formatarDataHora('2026-01-15T18:45:00.000Z')
    expect(texto).toBe('15/01/2026 18:45')
    expect(texto).not.toMatch(/AM|PM/i)
  })

  it('aplica o desvio de verão de Lisboa', () => {
    expect(formatarDataHora('2026-07-15T23:30:00.000Z')).toBe('16/07/2026 00:30')
  })

  it('devolve marcador para valores em falta', () => {
    expect(formatarData(null)).toBe('—')
  })
})

describe('limites de período', () => {
  it('a meia-noite de inverno é meia-noite UTC', () => {
    expect(inicioDoDiaLisboa('2026-01-10').toISOString()).toBe('2026-01-10T00:00:00.000Z')
  })

  it('a meia-noite de verão é 23:00 UTC do dia anterior', () => {
    expect(inicioDoDiaLisboa('2026-07-10').toISOString()).toBe('2026-07-09T23:00:00.000Z')
  })

  it('o fim do dia de verão termina às 22:59:59.999 UTC', () => {
    expect(fimDoDiaLisboa('2026-07-10').toISOString()).toBe('2026-07-10T22:59:59.999Z')
  })

  it('o fim do dia de inverno inclui o último milissegundo', () => {
    expect(fimDoDiaLisboa('2026-01-10').toISOString()).toBe('2026-01-10T23:59:59.999Z')
  })

  it('resolve o último domingo de março, em que a hora local salta', () => {
    const instante = lisboaParaUTC(2026, 3, 29, 3, 0)
    expect(instante.toISOString()).toBe('2026-03-29T02:00:00.000Z')
  })

  it('resolve o último domingo de outubro, em que a hora local repete', () => {
    const instante = lisboaParaUTC(2026, 10, 25, 3, 0)
    expect(instante.toISOString()).toBe('2026-10-25T03:00:00.000Z')
  })
})

describe('primeiroNome', () => {
  it('devolve a primeira palavra', () => {
    expect(primeiroNome('Ricardo Freitas')).toBe('Ricardo')
  })

  it('divide em espaços, não em letras', () => {
    // Com /s+/ em vez de /\s+/ isto dava "Sofia Sou", e o site agradecia assim.
    expect(primeiroNome('Sofia Sousa')).toBe('Sofia')
  })

  it('aguenta espaços a mais', () => {
    expect(primeiroNome('  Ana   Maria  ')).toBe('Ana')
  })

  it('devolve vazio quando não há nome', () => {
    expect(primeiroNome('')).toBe('')
    expect(primeiroNome(null)).toBe('')
  })

  it('nome de uma palavra fica igual', () => {
    expect(primeiroNome('Nuno')).toBe('Nuno')
  })
})

describe('formatarNif', () => {
  it('agrupa em três blocos de três', () => {
    expect(formatarNif('257877827')).toBe('257 877 827')
  })

  it('aceita um NIF que já venha espaçado', () => {
    expect(formatarNif('257 877 827')).toBe('257 877 827')
  })

  it('devolve marcador quando não há NIF', () => {
    expect(formatarNif(null)).toBe('—')
  })

  it('devolve o valor original se não tiver nove dígitos', () => {
    expect(formatarNif('POR PREENCHER')).toBe('POR PREENCHER')
  })
})

describe('formatarTelefone', () => {
  it('agrupa em três blocos', () => {
    expect(formatarTelefone('926556000')).toBe('926 556 000')
  })

  it('remove o indicativo de Portugal', () => {
    expect(formatarTelefone('+351926556000')).toBe('926 556 000')
  })
})
