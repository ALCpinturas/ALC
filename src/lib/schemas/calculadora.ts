import { z } from 'zod'
import { areaM2, consentimento, email, localidade, nome, telefone } from './comum'

export const TIPOS_ESPACO = ['apartamento', 'moradia', 'comercial', 'outro'] as const

export const ROTULO_ESPACO: Record<(typeof TIPOS_ESPACO)[number], string> = {
  apartamento: 'Apartamento',
  moradia: 'Moradia',
  comercial: 'Loja ou espaço comercial',
  outro: 'Outro',
}

export const TRABALHOS_CALCULADORA = [
  'pintura',
  'tetos_falsos',
  'divisorias',
  'pavimento',
  'acabamentos',
  'remodelacao_geral',
] as const

export const ROTULO_TRABALHO: Record<(typeof TRABALHOS_CALCULADORA)[number], string> = {
  pintura: 'Pintura',
  tetos_falsos: 'Tetos falsos',
  divisorias: 'Divisórias',
  pavimento: 'Pavimento',
  acabamentos: 'Acabamentos',
  remodelacao_geral: 'Remodelação geral',
}

export const ESTADOS_ESPACO = ['bom', 'algumas_reparacoes', 'intervencao_significativa'] as const

export const ROTULO_ESTADO_ESPACO: Record<(typeof ESTADOS_ESPACO)[number], string> = {
  bom: 'Bom',
  algumas_reparacoes: 'Necessita de algumas reparações',
  intervencao_significativa: 'Necessita de intervenção significativa',
}

export const passo1 = z.object({
  tipo_espaco: z.enum(TIPOS_ESPACO, {
    errorMap: () => ({ message: 'Escolha o tipo de espaço.' }),
  }),
})

export const passo2 = z.object({ area_m2: areaM2 })

export const passo3 = z.object({
  trabalhos: z
    .array(z.enum(TRABALHOS_CALCULADORA))
    .min(1, 'Escolha pelo menos um trabalho.'),
})

export const passo4 = z.object({
  estado_espaco: z.enum(ESTADOS_ESPACO, {
    errorMap: () => ({ message: 'Indique o estado atual do espaço.' }),
  }),
})

export const passo5 = z.object({
  localidade,
  nome,
  telefone,
  email,
  consentimento,
})

export const esquemaCalculadora = passo1
  .merge(passo2)
  .merge(passo3)
  .merge(passo4)
  .merge(passo5)

export type DadosCalculadora = z.infer<typeof esquemaCalculadora>
