import { createClient, FunctionsHttpError } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltam as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. ' +
      'Copie o ficheiro .env.example para .env.local e preencha os valores do painel do Supabase.',
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

/** Mensagem de erro legível, sem expor detalhes internos nem dados pessoais. */
export function mensagemErro(erro: unknown): string {
  if (!erro) return 'Ocorreu um erro inesperado.'
  if (erro instanceof Error) return erro.message
  if (typeof erro === 'object' && 'message' in erro) return String((erro as { message: unknown }).message)
  return 'Ocorreu um erro inesperado.'
}

/**
 * Mensagem de erro de uma Edge Function chamada por `supabase.functions.invoke`.
 *
 * `error.message` de um `FunctionsHttpError` é sempre o genérico "Edge Function returned a
 * non-2xx status code": as funções desta aplicação devolvem `{ erro: '...' }` no corpo, e é
 * preciso ler esse corpo para mostrar a razão real em vez do genérico.
 */
export async function mensagemErroFuncao(erro: unknown): Promise<string> {
  if (erro instanceof FunctionsHttpError) {
    try {
      const corpo = (await erro.context.json()) as { erro?: string }
      if (corpo.erro) return corpo.erro
    } catch {
      // Corpo sem JSON válido: cai para a mensagem genérica abaixo.
    }
  }
  return mensagemErro(erro)
}
