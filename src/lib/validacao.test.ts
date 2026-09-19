import { describe, expect, it } from 'vitest'
import { CODIGO_POSTAL_PT, nifValido, normalizarTelefone, telefoneValido } from './validacao'

describe('nifValido', () => {
  it('aceita o NIF do emitente dos orçamentos', () => {
    expect(nifValido('257877827')).toBe(true)
  })

  it('recusa um NIF com um dígito trocado', () => {
    // O mesmo número com 9 no lugar do 8: o dígito de controlo deixa de bater certo.
    expect(nifValido('257977827')).toBe(false)
  })

  it('aceita NIF de pessoa coletiva', () => {
    expect(nifValido('501442600')).toBe(true)
  })

  it('recusa números com menos de nove dígitos', () => {
    expect(nifValido('25787782')).toBe(false)
  })

  it('recusa um primeiro dígito que não existe em NIF português', () => {
    expect(nifValido('457877827')).toBe(false)
  })

  it('ignora espaços', () => {
    expect(nifValido('257 877 827')).toBe(true)
  })

  it('recusa texto', () => {
    expect(nifValido('POR PREENCHER')).toBe(false)
  })
})

describe('telefoneValido', () => {
  it('aceita um móvel português', () => {
    expect(telefoneValido('926556000')).toBe(true)
  })

  it('aceita com indicativo internacional', () => {
    expect(telefoneValido('+351 926 556 000')).toBe(true)
  })

  it('aceita um fixo de Vila Real', () => {
    expect(telefoneValido('259123456')).toBe(true)
  })

  it('recusa um número com dígitos a mais', () => {
    expect(telefoneValido('9265560001')).toBe(false)
  })

  it('recusa um indicativo que não existe', () => {
    expect(telefoneValido('126556000')).toBe(false)
  })
})

describe('normalizarTelefone', () => {
  it('remove espaços, pontos e traços', () => {
    expect(normalizarTelefone('926.556-000')).toBe('926556000')
  })
})

describe('CODIGO_POSTAL_PT', () => {
  it('aceita o formato com quatro e três dígitos', () => {
    expect(CODIGO_POSTAL_PT.test('5000-507')).toBe(true)
  })

  it('recusa sem o traço', () => {
    expect(CODIGO_POSTAL_PT.test('5000507')).toBe(false)
  })
})
