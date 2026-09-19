import { describe, expect, it } from 'vitest'
import { fundirImagensSite } from './imagensSite'
import type { ImagemSiteRow } from '@/types/database'

function linha(parcial: Partial<ImagemSiteRow> & Pick<ImagemSiteRow, 'chave'>): ImagemSiteRow {
  return {
    url: '',
    texto_alternativo: '',
    storage_path: null,
    atualizado_em: '2026-09-16T00:00:00.000Z',
    ...parcial,
  }
}

describe('fundirImagensSite', () => {
  it('devolve os seis sítios mesmo sem linhas na base de dados', () => {
    const resultado = fundirImagensSite([])
    expect(resultado.map((slot) => slot.chave)).toEqual([
      'hero',
      'sobre',
      'servico_pintura',
      'servico_pladur',
      'servico_pavimentos',
      'servico_acabamentos',
    ])
    expect(resultado.every((slot) => slot.url.startsWith('/site/'))).toBe(true)
    expect(resultado.every((slot) => !slot.personalizada)).toBe(true)
  })

  it('usa a fotografia carregada quando há um caminho de storage', () => {
    const resultado = fundirImagensSite([
      linha({
        chave: 'hero',
        url: 'https://cdn.exemplo.pt/hero.jpg',
        texto_alternativo: 'Sala do cliente em Lisboa.',
        storage_path: 'hero/abc.jpg',
      }),
    ])
    const hero = resultado.find((slot) => slot.chave === 'hero')
    expect(hero?.url).toBe('https://cdn.exemplo.pt/hero.jpg')
    expect(hero?.texto_alternativo).toBe('Sala do cliente em Lisboa.')
    expect(hero?.personalizada).toBe(true)
  })

  it('ignora um url vazio e volta à imagem de partida', () => {
    const resultado = fundirImagensSite([linha({ chave: 'sobre', url: '   ' })])
    const sobre = resultado.find((slot) => slot.chave === 'sobre')
    expect(sobre?.url).toBe('/site/sobre.jpg')
    expect(sobre?.personalizada).toBe(false)
  })
})
