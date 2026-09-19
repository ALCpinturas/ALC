import { describe, expect, it } from 'vitest'
import { calcularTrocaOrdem } from './portefolio'

interface ItemOrdem {
  id: string
  ordem: number
}

function itens(...ordens: number[]): ItemOrdem[] {
  return ordens.map((ordem, indice) => ({ id: `item-${indice}`, ordem }))
}

describe('calcularTrocaOrdem', () => {
  it('troca com o vizinho seguinte ao mover para baixo', () => {
    const resultado = calcularTrocaOrdem(itens(0, 1, 2), 'item-0', 1)
    expect(resultado).toEqual({ atual: 'item-0', ordemAtual: 0, vizinho: 'item-1', ordemVizinho: 1 })
  })

  it('troca com o vizinho anterior ao mover para cima', () => {
    const resultado = calcularTrocaOrdem(itens(0, 1, 2), 'item-2', -1)
    expect(resultado).toEqual({ atual: 'item-2', ordemAtual: 2, vizinho: 'item-1', ordemVizinho: 1 })
  })

  it('devolve null ao tentar mover o primeiro item para cima', () => {
    expect(calcularTrocaOrdem(itens(0, 1, 2), 'item-0', -1)).toBeNull()
  })

  it('devolve null ao tentar mover o último item para baixo', () => {
    expect(calcularTrocaOrdem(itens(0, 1, 2), 'item-2', 1)).toBeNull()
  })

  it('devolve null quando o id não existe na lista', () => {
    expect(calcularTrocaOrdem(itens(0, 1, 2), 'inexistente', 1)).toBeNull()
  })

  it('ordena os itens antes de calcular, mesmo que cheguem fora de ordem', () => {
    const desordenados = [
      { id: 'c', ordem: 2 },
      { id: 'a', ordem: 0 },
      { id: 'b', ordem: 1 },
    ]
    expect(calcularTrocaOrdem(desordenados, 'a', 1)).toEqual({
      atual: 'a',
      ordemAtual: 0,
      vizinho: 'b',
      ordemVizinho: 1,
    })
  })
})
