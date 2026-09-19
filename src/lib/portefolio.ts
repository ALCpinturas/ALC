import type { DadosObraPublica } from '@/lib/schemas/gestao'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { ObraPublicaImagemRow, ObraPublicaRow } from '@/types/database'

export const BALDE_PORTEFOLIO = 'obras-publicas'

export interface ObraPublicaComImagens extends ObraPublicaRow {
  imagens: ObraPublicaImagemRow[]
}

export async function criarObraPublica(
  dados: DadosObraPublica,
): Promise<{ id: string } | { erro: string }> {
  // Nasce oculta: só aparece no site quando tiver fotografias e o administrador decidir mostrar.
  const { data, error } = await supabase
    .from('obras_publicas')
    .insert({ ...dados, visivel: false })
    .select('id')
    .single()
  if (error || !data) return { erro: mensagemErro(error) }
  return { id: data.id }
}

export async function atualizarObraPublica(
  id: string,
  dados: DadosObraPublica,
): Promise<string | null> {
  const { error } = await supabase.from('obras_publicas').update(dados).eq('id', id)
  return error ? mensagemErro(error) : null
}

export async function alternarVisibilidadeObra(id: string, visivel: boolean): Promise<string | null> {
  const { error } = await supabase.from('obras_publicas').update({ visivel }).eq('id', id)
  return error ? mensagemErro(error) : null
}

export async function apagarObraPublica(obra: ObraPublicaComImagens): Promise<string | null> {
  const { error } = await supabase.from('obras_publicas').delete().eq('id', obra.id)
  if (error) return mensagemErro(error)

  const caminhos = obra.imagens
    .map((imagem) => imagem.storage_path)
    .filter((caminho): caminho is string => Boolean(caminho))
  if (caminhos.length > 0) {
    await supabase.storage.from(BALDE_PORTEFOLIO).remove(caminhos)
  }
  return null
}

export async function definirCapa(obraId: string, url: string | null): Promise<string | null> {
  const { error } = await supabase.from('obras_publicas').update({ imagem_capa: url }).eq('id', obraId)
  return error ? mensagemErro(error) : null
}

export async function atualizarImagemPortefolio(
  id: string,
  dados: { legenda: string | null; categoria: ObraPublicaImagemRow['categoria'] },
): Promise<string | null> {
  const { error } = await supabase.from('obras_publicas_imagens').update(dados).eq('id', id)
  return error ? mensagemErro(error) : null
}

export async function alternarVisibilidadeImagem(id: string, visivel: boolean): Promise<string | null> {
  const { error } = await supabase.from('obras_publicas_imagens').update({ visivel }).eq('id', id)
  return error ? mensagemErro(error) : null
}

export async function apagarImagemPortefolio(imagem: ObraPublicaImagemRow): Promise<string | null> {
  const { error } = await supabase.from('obras_publicas_imagens').delete().eq('id', imagem.id)
  if (error) return mensagemErro(error)
  if (imagem.storage_path) {
    await supabase.storage.from(BALDE_PORTEFOLIO).remove([imagem.storage_path])
  }
  return null
}

interface TrocaOrdem {
  atual: string
  ordemAtual: number
  vizinho: string
  ordemVizinho: number
}

/** Par de itens adjacentes a trocar de posição, ou null se já está numa ponta da lista. */
export function calcularTrocaOrdem<T extends { id: string; ordem: number }>(
  itens: readonly T[],
  id: string,
  direcao: -1 | 1,
): TrocaOrdem | null {
  const ordenados = [...itens].sort((a, b) => a.ordem - b.ordem)
  const indice = ordenados.findIndex((item) => item.id === id)
  const atual = ordenados[indice]
  const vizinho = ordenados[indice + direcao]
  if (indice === -1 || !atual || !vizinho) return null
  return { atual: atual.id, ordemAtual: atual.ordem, vizinho: vizinho.id, ordemVizinho: vizinho.ordem }
}

export async function moverObra(
  obras: readonly ObraPublicaRow[],
  id: string,
  direcao: -1 | 1,
): Promise<string | null> {
  const troca = calcularTrocaOrdem(obras, id, direcao)
  if (!troca) return null
  const { error: erro1 } = await supabase
    .from('obras_publicas')
    .update({ ordem: troca.ordemVizinho })
    .eq('id', troca.atual)
  const { error: erro2 } = await supabase
    .from('obras_publicas')
    .update({ ordem: troca.ordemAtual })
    .eq('id', troca.vizinho)
  return erro1 || erro2 ? mensagemErro(erro1 ?? erro2) : null
}

export async function moverImagemPortefolio(
  imagens: readonly ObraPublicaImagemRow[],
  id: string,
  direcao: -1 | 1,
): Promise<string | null> {
  const troca = calcularTrocaOrdem(imagens, id, direcao)
  if (!troca) return null
  const { error: erro1 } = await supabase
    .from('obras_publicas_imagens')
    .update({ ordem: troca.ordemVizinho })
    .eq('id', troca.atual)
  const { error: erro2 } = await supabase
    .from('obras_publicas_imagens')
    .update({ ordem: troca.ordemAtual })
    .eq('id', troca.vizinho)
  return erro1 || erro2 ? mensagemErro(erro1 ?? erro2) : null
}
