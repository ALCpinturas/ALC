import { z } from 'zod'

/**
 * Mínimo acima do que o Supabase exige por omissão. O backoffice lê nomes, telefones,
 * moradas e fotografias de interiores de clientes: uma palavra-passe de seis caracteres
 * não é defesa suficiente para isso.
 */
export const MINIMO_PALAVRA_PASSE = 10

// O bcrypt trunca aos 72 bytes. Aceitar mais é prometer uma segurança que não existe.
const MAXIMO_PALAVRA_PASSE = 72

export const palavraPasse = z
  .string()
  .min(MINIMO_PALAVRA_PASSE, `A palavra-passe tem de ter pelo menos ${MINIMO_PALAVRA_PASSE} caracteres.`)
  .max(MAXIMO_PALAVRA_PASSE, `A palavra-passe não pode ter mais de ${MAXIMO_PALAVRA_PASSE} caracteres.`)
  .refine((valor) => /\p{L}/u.test(valor), 'A palavra-passe tem de incluir pelo menos uma letra.')
  .refine((valor) => /\d/.test(valor), 'A palavra-passe tem de incluir pelo menos um algarismo.')

export const esquemaAlterarPalavraPasse = z
  .object({
    atual: z.string().min(1, 'Indique a palavra-passe atual.'),
    nova: palavraPasse,
    confirmacao: z.string().min(1, 'Repita a nova palavra-passe.'),
  })
  .superRefine((valores, ctx) => {
    if (valores.nova !== valores.confirmacao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmacao'],
        message: 'As duas palavras-passe não coincidem.',
      })
    }
    if (valores.atual.length > 0 && valores.nova === valores.atual) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nova'],
        message: 'A nova palavra-passe tem de ser diferente da atual.',
      })
    }
  })

export type DadosAlterarPalavraPasse = z.infer<typeof esquemaAlterarPalavraPasse>

export const PAPEIS = ['admin', 'equipa'] as const

export const ROTULO_PAPEL: Record<(typeof PAPEIS)[number], string> = {
  admin: 'Administrador',
  equipa: 'Equipa',
}

export const DESCRICAO_PAPEL: Record<(typeof PAPEIS)[number], string> = {
  admin: 'Acesso total, incluindo apagar registos e criar contas.',
  equipa: 'Trabalha em leads, clientes, obras e orçamentos.',
}

export const esquemaNovoUtilizador = z.object({
  nome: z
    .string()
    .trim()
    .min(2, 'Indique o nome da pessoa.')
    .max(120, 'O nome é demasiado longo.'),
  email: z.string().trim().min(1, 'Indique o email de acesso.').email('O email indicado não é válido.'),
  palavraPasse,
  papel: z.enum(PAPEIS),
})

export type DadosNovoUtilizador = z.infer<typeof esquemaNovoUtilizador>
