import { z } from 'zod'
import {
  areaM2,
  consentimento,
  email,
  localidade,
  nome,
  telefone,
  TIPOS_INTERVENCAO,
} from './comum'

export const esquemaContacto = z.object({
  nome,
  telefone,
  email,
  localidade,
  tipo_intervencao: z.enum(TIPOS_INTERVENCAO, {
    errorMap: () => ({ message: 'Escolha o tipo de trabalho pretendido.' }),
  }),
  area_m2: areaM2.optional().nullable(),
  mensagem: z
    .string()
    .trim()
    .min(10, 'Descreva o que pretende, com pelo menos 10 caracteres.')
    .max(4000, 'A mensagem é demasiado longa.'),
  consentimento,
})

export type DadosContacto = z.infer<typeof esquemaContacto>
