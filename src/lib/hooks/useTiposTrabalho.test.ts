import { describe, expect, it } from 'vitest'
import { chaveAPartirDe, chaveLivre } from './useTiposTrabalho'

describe('chaveAPartirDe', () => {
  it('põe em minúsculas e separa por underscore', () => {
    expect(chaveAPartirDe('Pintura de paredes')).toBe('pintura_de_paredes')
  })

  it('remove acentos', () => {
    expect(chaveAPartirDe('Aplicação de tela líquida')).toBe('aplicacao_de_tela_liquida')
  })

  it('descarta pontuação', () => {
    expect(chaveAPartirDe('Rodapé (MDF) 10cm!')).toBe('rodape_mdf_10cm')
  })

  it('não deixa underscores nas pontas', () => {
    expect(chaveAPartirDe('  Estuque  ')).toBe('estuque')
  })

  it('limita o comprimento', () => {
    expect(chaveAPartirDe('a'.repeat(80)).length).toBe(40)
  })
})

describe('chaveLivre', () => {
  it('usa a chave da descrição quando está livre', () => {
    expect(chaveLivre('Tela líquida', ['pintura'])).toBe('tela_liquida')
  })

  it('não sobrepõe uma chave já existente', () => {
    // "Pintura" e "Pintura!" geram a mesma chave: a segunda tem de ficar noutra.
    expect(chaveLivre('Pintura!', ['pintura'])).toBe('pintura_2')
  })

  it('continua a contar enquanto houver colisões', () => {
    expect(chaveLivre('Pintura', ['pintura', 'pintura_2', 'pintura_3'])).toBe('pintura_4')
  })

  it('não devolve chave vazia para uma descrição só de símbolos', () => {
    expect(chaveLivre('###', [])).toBe('trabalho')
  })
})
