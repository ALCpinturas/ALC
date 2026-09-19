/** Escala única dos gráficos, derivada da marca. Nenhum gráfico define cores próprias. */
export const ESCALA_GRAFICOS = ['#F4DCCF', '#DCBBAD', '#C39A8B', '#A9796A', '#7A4F42'] as const

export const COR_GRELHA = '#ECEBE9'
export const COR_EIXO = '#1A1A1A'
export const TAMANHO_EIXO = 12

export function corDaSerie(indice: number): string {
  return ESCALA_GRAFICOS[indice % ESCALA_GRAFICOS.length] ?? ESCALA_GRAFICOS[4]
}

export const ESTILO_TOOLTIP = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #DDD9D6',
  borderRadius: 2,
  fontSize: 12,
  color: COR_EIXO,
} as const
