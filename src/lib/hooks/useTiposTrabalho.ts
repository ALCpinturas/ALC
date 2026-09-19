import { useCallback, useEffect, useState } from 'react'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { PrecoUnitarioRow } from '@/types/database'

/**
 * O catálogo de tipos de trabalho.
 *
 * Alimenta o menu das linhas de orçamento e a estimativa que fica guardada na lead para
 * consulta interna. O visitante do site nunca vê estes valores: o funil promete contacto,
 * não um número.
 */
export function useTiposTrabalho(apenasAtivos = true) {
  const [tipos, setTipos] = useState<PrecoUnitarioRow[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    setErro(null)

    let consulta = supabase.from('precos_unitarios').select('*')
    if (apenasAtivos) consulta = consulta.eq('ativo', true)

    const { data, error } = await consulta
      .order('ordem', { ascending: true })
      .order('descricao', { ascending: true })

    if (error) {
      setErro(mensagemErro(error))
      setTipos([])
    } else {
      setTipos(data ?? [])
    }
    setACarregar(false)
  }, [apenasAtivos])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { tipos, aCarregar, erro, recarregar: carregar }
}

export type DadosTipoTrabalho = Pick<
  PrecoUnitarioRow,
  'chave' | 'descricao' | 'capitulo' | 'unidade' | 'preco_min_cents' | 'preco_max_cents' | 'ativo' | 'ordem'
>

export async function guardarTipoTrabalho(
  id: string | null,
  dados: DadosTipoTrabalho,
): Promise<string | null> {
  const registo = { ...dados, atualizado_em: new Date().toISOString() }
  const { error } = id
    ? await supabase.from('precos_unitarios').update(registo).eq('id', id)
    : await supabase.from('precos_unitarios').insert(registo)
  return error ? mensagemErro(error) : null
}

/** Gera uma chave estável a partir da descrição, para os registos criados na aplicação. */
export function chaveAPartirDe(descricao: string): string {
  return descricao
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

/**
 * Chave que ainda não está em uso.
 *
 * Duas descrições diferentes podem gerar a mesma chave, por exemplo "Pintura" e "Pintura!".
 * Sem isto, guardar a segunda sobrescrevia a primeira em silêncio.
 */
export function chaveLivre(descricao: string, usadas: readonly string[]): string {
  const base = chaveAPartirDe(descricao) || 'trabalho'
  if (!usadas.includes(base)) return base
  for (let n = 2; n < 100; n += 1) {
    const tentativa = `${base}_${n}`.slice(0, 40)
    if (!usadas.includes(tentativa)) return tentativa
  }
  return `${base}_${Date.now().toString(36)}`.slice(0, 40)
}

/** Acrescenta ao catálogo um trabalho escrito à mão numa linha de orçamento. */
export async function acrescentarAoCatalogo(
  dados: Omit<DadosTipoTrabalho, 'chave' | 'ativo' | 'ordem'>,
  chavesUsadas: readonly string[],
  ordemSeguinte: number,
): Promise<string | null> {
  return guardarTipoTrabalho(null, {
    ...dados,
    chave: chaveLivre(dados.descricao, chavesUsadas),
    ativo: true,
    ordem: ordemSeguinte,
  })
}
