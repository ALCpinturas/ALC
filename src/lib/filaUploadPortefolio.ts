import { comprimirImagem } from '@/lib/imagens'
import { BALDE_PORTEFOLIO } from '@/lib/portefolio'
import { supabase } from '@/lib/supabase'
import { FilaUploadBase, type EstadoItemFila, type ItemFilaBase } from '@/lib/filaUploadBase'

export type EstadoItemPortefolio = EstadoItemFila
export type ItemFilaPortefolio = ItemFilaBase

function criarItem(obraId: string, ficheiro: File): ItemFilaPortefolio {
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
  item: ItemFilaPortefolio,
  atualizarProgresso: (progresso: number) => void,
): Promise<void> {
  const comprimida = await comprimirImagem(item.ficheiro, { larguraMaxima: 2048, qualidade: 0.82 })

  atualizarProgresso(40)
  const caminho = `${item.obraId}/${crypto.randomUUID()}.jpg`
  const { error: erroUpload } = await supabase.storage
    .from(BALDE_PORTEFOLIO)
    .upload(caminho, comprimida.ficheiro, { contentType: 'image/jpeg' })
  if (erroUpload) throw erroUpload

  atualizarProgresso(70)
  // Ordem no fim da lista atual: aproximado, mas suficiente para um único administrador.
  const { count } = await supabase
    .from('obras_publicas_imagens')
    .select('id', { count: 'exact', head: true })
    .eq('obra_id', item.obraId)

  const { data: publica } = supabase.storage.from(BALDE_PORTEFOLIO).getPublicUrl(caminho)
  const { error: erroLinha } = await supabase.from('obras_publicas_imagens').insert({
    obra_id: item.obraId,
    url: publica.publicUrl,
    storage_path: caminho,
    categoria: null,
    legenda: null,
    ordem: count ?? 0,
  })
  if (erroLinha) throw erroLinha
}

export const filaUploadPortefolio = new FilaUploadBase<ItemFilaPortefolio>(criarItem, enviarUm)
