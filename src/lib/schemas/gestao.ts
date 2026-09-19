import { z } from 'zod'
import { codigoPostal, nif, ESTADOS_OBRA, TIPOS_INTERVENCAO } from './comum'
import { telefoneValido } from '@/lib/validacao'

const opcional = (esquema: z.ZodTypeAny) =>
  z
    .string()
    .trim()
    .transform((valor) => (valor === '' ? null : valor))
    .nullable()
    .superRefine((valor, ctx) => {
      if (valor === null) return
      const resultado = esquema.safeParse(valor)
      if (!resultado.success) {
        const primeiro = resultado.error.issues[0]
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: primeiro?.message ?? 'Valor inválido.' })
      }
    })

export const esquemaCliente = z.object({
  nome: z.string().trim().min(2, 'Indique o nome do cliente.'),
  telefone: opcional(z.string().refine(telefoneValido, 'Indique um telefone português válido.')),
  email: opcional(z.string().email('O email indicado não é válido.')),
  nif: opcional(nif),
  morada: opcional(z.string()),
  codigo_postal: opcional(codigoPostal),
  localidade: opcional(z.string()),
  notas: opcional(z.string()),
  origem: z.enum(['formulario', 'calculadora', 'telefone', 'recomendacao', 'outro']),
})

export type DadosCliente = z.infer<typeof esquemaCliente>

export const esquemaObra = z.object({
  cliente_id: z.string().uuid('Escolha o cliente da obra.'),
  titulo: z.string().trim().min(3, 'Indique um título para a obra.'),
  morada: opcional(z.string()),
  localidade: opcional(z.string()),
  tipos_intervencao: z.array(z.enum(TIPOS_INTERVENCAO)).min(1, 'Escolha pelo menos um tipo de trabalho.'),
  estado: z.enum(ESTADOS_OBRA),
  data_inicio: opcional(z.string()),
  data_fim_prevista: opcional(z.string()),
  notas: opcional(z.string()),
})

export type DadosObra = z.infer<typeof esquemaObra>

export const esquemaObraPublica = z.object({
  titulo: z.string().trim().min(3, 'Indique um título para a obra.'),
  localidade: opcional(z.string()),
  tipo_intervencao: z.enum(TIPOS_INTERVENCAO, {
    errorMap: () => ({ message: 'Escolha o tipo de trabalho.' }),
  }),
  descricao: opcional(z.string()),
})

export type DadosObraPublica = z.infer<typeof esquemaObraPublica>

export const esquemaMedicao = z.object({
  divisao: z.string().trim().min(1, 'Indique o nome da divisão.'),
  comprimento_cm: z.number().int().positive('O comprimento tem de ser maior do que zero.'),
  largura_cm: z.number().int().positive('A largura tem de ser maior do que zero.'),
  pe_direito_cm: z.number().int().positive('O pé direito tem de ser maior do que zero.'),
  notas: z.string().trim().nullable(),
})

export type DadosMedicao = z.infer<typeof esquemaMedicao>

export const esquemaLinhaOrcamento = z.object({
  capitulo: z.string().trim().min(1, 'Indique o capítulo.'),
  descricao: z.string().trim().min(3, 'Descreva o trabalho.'),
  unidade: z.enum(['m2', 'ml', 'un', 'vg']),
  quantidade: z.number().min(0, 'A quantidade não pode ser negativa.'),
  preco_unitario_cents: z.number().int().min(0, 'O preço não pode ser negativo.'),
})

export type DadosLinhaOrcamento = z.infer<typeof esquemaLinhaOrcamento>
