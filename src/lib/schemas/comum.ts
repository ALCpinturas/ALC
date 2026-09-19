import { z } from 'zod'
import { CODIGO_POSTAL_PT, nifValido, telefoneValido } from '@/lib/validacao'

export const TEXTO_CONSENTIMENTO =
  'Li e aceito a Política de Privacidade e autorizo o tratamento dos meus dados para resposta ao pedido de orçamento.'

export const nome = z
  .string()
  .trim()
  .min(2, 'Indique o seu nome.')
  .max(120, 'O nome é demasiado longo.')

export const telefone = z
  .string()
  .trim()
  .min(1, 'Indique um telefone de contacto.')
  .refine(telefoneValido, 'Indique um número de telefone português válido.')

export const email = z
  .string()
  .trim()
  .min(1, 'Indique o seu email.')
  .email('O email indicado não é válido.')

export const localidade = z.string().trim().min(2, 'Indique a localidade da obra.')

export const areaM2 = z
  .number({ invalid_type_error: 'Indique a área em metros quadrados.' })
  .positive('A área tem de ser maior do que zero.')
  .max(10000, 'Confirme a área indicada.')

export const codigoPostal = z
  .string()
  .trim()
  .regex(CODIGO_POSTAL_PT, 'O código postal deve ter o formato 0000-000.')

export const nif = z.string().trim().refine(nifValido, 'O NIF indicado não é válido.')

export const consentimento = z.literal(true, {
  errorMap: () => ({ message: 'É necessário aceitar a Política de Privacidade para continuar.' }),
})

export const TIPOS_INTERVENCAO = [
  'pintura',
  'pladur',
  'pavimentos',
  'acabamentos',
  'remodelacao',
] as const

export const ROTULO_INTERVENCAO: Record<(typeof TIPOS_INTERVENCAO)[number], string> = {
  pintura: 'Pintura',
  pladur: 'Tetos falsos e divisórias',
  pavimentos: 'Pavimentos',
  acabamentos: 'Acabamentos',
  remodelacao: 'Remodelação geral',
}

export const ESTADOS_LEAD = ['novo', 'contactado', 'orcamentado', 'fechado'] as const

export const ROTULO_ESTADO_LEAD: Record<(typeof ESTADOS_LEAD)[number], string> = {
  novo: 'Novo',
  contactado: 'Contactado',
  orcamentado: 'Orçamentado',
  fechado: 'Fechado',
}

export const ESTADOS_OBRA = ['proposta', 'adjudicada', 'em_curso', 'concluida', 'cancelada'] as const

export const ROTULO_ESTADO_OBRA: Record<(typeof ESTADOS_OBRA)[number], string> = {
  proposta: 'Proposta',
  adjudicada: 'Adjudicada',
  em_curso: 'Em curso',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

export const ESTADOS_ORCAMENTO = ['rascunho', 'enviado', 'aceite', 'recusado', 'expirado'] as const

export const ROTULO_ESTADO_ORCAMENTO: Record<(typeof ESTADOS_ORCAMENTO)[number], string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aceite: 'Aceite',
  recusado: 'Recusado',
  expirado: 'Expirado',
}
