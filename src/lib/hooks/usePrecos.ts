import { useEffect, useState } from 'react'
import { mensagemErro, supabase } from '@/lib/supabase'
import type { PrecoUnitario } from '@/lib/calculo/estimativa'
import type { CoeficienteEstadoRow } from '@/types/database'

interface Tabelas {
  precos: PrecoUnitario[]
  coeficientes: CoeficienteEstadoRow[]
  aCarregar: boolean
  erro: string | null
}

export function usePrecos(): Tabelas {
  const [estado, setEstado] = useState<Tabelas>({
    precos: [],
    coeficientes: [],
    aCarregar: true,
    erro: null,
  })

  useEffect(() => {
    let ativo = true

    async function carregar() {
      const [resultadoPrecos, resultadoCoeficientes] = await Promise.all([
        supabase.from('precos_unitarios').select('chave, preco_cents').eq('ativo', true),
        supabase.from('coeficientes_estado').select('*'),
      ])
      if (!ativo) return

      const erro = resultadoPrecos.error ?? resultadoCoeficientes.error
      setEstado({
        precos: (resultadoPrecos.data ?? []) as PrecoUnitario[],
        coeficientes: (resultadoCoeficientes.data ?? []) as CoeficienteEstadoRow[],
        aCarregar: false,
        erro: erro ? mensagemErro(erro) : null,
      })
    }

    void carregar()
    return () => {
      ativo = false
    }
  }, [])

  return estado
}
