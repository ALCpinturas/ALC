import { describe, expect, it } from 'vitest'
import {
  esquemaAlterarPalavraPasse,
  esquemaNovoUtilizador,
  MINIMO_PALAVRA_PASSE,
  palavraPasse,
} from './conta'

function primeiroErro(resultado: { success: boolean; error?: { issues: { message: string }[] } }) {
  return resultado.success ? null : (resultado.error?.issues[0]?.message ?? null)
}

describe('palavraPasse', () => {
  it('aceita uma palavra-passe com letras, algarismos e o comprimento mínimo', () => {
    expect(palavraPasse.safeParse('andaime2026').success).toBe(true)
  })

  it('recusa abaixo do comprimento mínimo', () => {
    const resultado = palavraPasse.safeParse('curta1')
    expect(resultado.success).toBe(false)
    expect(primeiroErro(resultado)).toContain(String(MINIMO_PALAVRA_PASSE))
  })

  it('recusa uma palavra-passe só com letras', () => {
    expect(palavraPasse.safeParse('somenteletras').success).toBe(false)
  })

  it('recusa uma palavra-passe só com algarismos', () => {
    expect(palavraPasse.safeParse('1234567890').success).toBe(false)
  })

  it('aceita letras acentuadas como letras', () => {
    expect(palavraPasse.safeParse('remodelação7').success).toBe(true)
  })

  it('recusa acima dos 72 bytes que o bcrypt trunca', () => {
    expect(palavraPasse.safeParse(`${'a'.repeat(72)}1`).success).toBe(false)
  })
})

describe('esquemaAlterarPalavraPasse', () => {
  const base = { atual: 'anterior1234', nova: 'andaime2026', confirmacao: 'andaime2026' }

  it('aceita uma mudança válida', () => {
    expect(esquemaAlterarPalavraPasse.safeParse(base).success).toBe(true)
  })

  it('recusa quando a confirmação não coincide', () => {
    const resultado = esquemaAlterarPalavraPasse.safeParse({ ...base, confirmacao: 'andaime2027' })
    expect(resultado.success).toBe(false)
    expect(primeiroErro(resultado)).toBe('As duas palavras-passe não coincidem.')
  })

  it('recusa repetir a palavra-passe atual', () => {
    const resultado = esquemaAlterarPalavraPasse.safeParse({
      atual: 'andaime2026',
      nova: 'andaime2026',
      confirmacao: 'andaime2026',
    })
    expect(resultado.success).toBe(false)
    expect(primeiroErro(resultado)).toBe('A nova palavra-passe tem de ser diferente da atual.')
  })

  it('exige a palavra-passe atual', () => {
    expect(esquemaAlterarPalavraPasse.safeParse({ ...base, atual: '' }).success).toBe(false)
  })
})

describe('esquemaNovoUtilizador', () => {
  const base = {
    nome: 'Alexandre Padilha',
    email: 'alexandre@alc.pt',
    palavraPasse: 'estaleiro2026',
    papel: 'admin' as const,
  }

  it('aceita um administrador válido', () => {
    expect(esquemaNovoUtilizador.safeParse(base).success).toBe(true)
  })

  it('limpa espaços à volta do nome e do email', () => {
    const resultado = esquemaNovoUtilizador.safeParse({
      ...base,
      nome: '  Alexandre Padilha  ',
      email: '  alexandre@alc.pt ',
    })
    expect(resultado.success && resultado.data.nome).toBe('Alexandre Padilha')
    expect(resultado.success && resultado.data.email).toBe('alexandre@alc.pt')
  })

  it('recusa um email inválido', () => {
    expect(esquemaNovoUtilizador.safeParse({ ...base, email: 'alexandre@' }).success).toBe(false)
  })

  it('recusa um papel que não existe', () => {
    expect(esquemaNovoUtilizador.safeParse({ ...base, papel: 'gestor' }).success).toBe(false)
  })
})
