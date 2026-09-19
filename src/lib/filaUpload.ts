import { comprimirImagem } from '@/lib/imagens'
import { supabase } from '@/lib/supabase'
import { FilaUploadBase, type EstadoItemFila, type ItemFilaBase } from '@/lib/filaUploadBase'

export type EstadoItem = EstadoItemFila
export type ItemFila = ItemFilaBase

function criarItem(obraId: string, ficheiro: File): ItemFila {
  return {
    id: crypto.randomUUID(),
    obraId,
    nome: ficheiro.name,
    estado: 'pendente',
    progresso: 0,
    tentativas: 0,
    erro: null,
    ficheiro,
  }
}

async function enviarUm(
  item: ItemFila,
  atualizarProgresso: (progresso: number) => void,
): Promise<void> {
  const comprimida = await comprimirImagem(item.ficheiro, { larguraMaxima: 2048, qualidade: 0.82 })

  atualizarProgresso(45)
  const caminho = `${item.obraId}/${crypto.randomUUID()}.jpg`
  const { error: erroUpload } = await supabase.storage
    .from('obras-fotografias')
    .upload(caminho, comprimida.ficheiro, { contentType: 'image/jpeg' })
  if (erroUpload) throw erroUpload

  atualizarProgresso(80)
  const { error: erroLinha } = await supabase.from('obras_fotografias').insert({
    obra_id: item.obraId,
    storage_path: caminho,
    largura: comprimida.largura,
    altura: comprimida.altura,
    categoria: null,
    legenda: null,
    carregado_por: null,
  })
  if (erroLinha) throw erroLinha
}

export const filaUpload = new FilaUploadBase<ItemFila>(criarItem, enviarUm)
