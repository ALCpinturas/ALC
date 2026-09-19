import { useCallback, useMemo, useState } from 'react'
import type { z } from 'zod'

type Erros<Valores> = Partial<Record<keyof Valores & string, string>>

/**
 * Formulário mínimo sobre zod. Valida ao perder o foco e ao submeter,
 * nunca a cada tecla, para não acusar erros enquanto a pessoa ainda escreve.
 */
export function useFormulario<Esquema extends z.ZodTypeAny, Valores extends Record<string, unknown>>(
  esquema: Esquema,
  inicial: Valores,
) {
  const [valores, setValores] = useState<Valores>(inicial)
  const [erros, setErros] = useState<Erros<Valores>>({})
  const [tocados, setTocados] = useState<Partial<Record<string, boolean>>>({})
  const [aSubmeter, setASubmeter] = useState(false)

  const errosDe = useCallback((dados: Valores): Erros<Valores> => {
    const resultado = esquema.safeParse(dados)
    if (resultado.success) return {}
    const saida: Erros<Valores> = {}
    for (const problema of resultado.error.issues) {
      const campo = problema.path[0]
      if (typeof campo === 'string' && !(campo in saida)) {
        saida[campo as keyof Valores & string] = problema.message
      }
    }
    return saida
  }, [esquema])

  const definir = useCallback(
    <Campo extends keyof Valores & string>(campo: Campo, valor: Valores[Campo]) => {
      setValores((anteriores) => ({ ...anteriores, [campo]: valor }))
      setErros((anteriores) => {
        if (!anteriores[campo]) return anteriores
        const copia = { ...anteriores }
        delete copia[campo]
        return copia
      })
    },
    [],
  )

  const aoSairDoCampo = useCallback(
    (campo: keyof Valores & string) => {
      setTocados((anteriores) => ({ ...anteriores, [campo]: true }))
      const todos = errosDe(valores)
      setErros((anteriores) =>
        todos[campo] ? { ...anteriores, [campo]: todos[campo] } : anteriores,
      )
    },
    [errosDe, valores],
  )

  const validar = useCallback((): z.infer<Esquema> | null => {
    const resultado = esquema.safeParse(valores)
    if (resultado.success) {
      setErros({})
      return resultado.data as z.infer<Esquema>
    }
    setErros(errosDe(valores))
    setTocados((anteriores) => {
      const copia = { ...anteriores }
      for (const chave of Object.keys(valores)) copia[chave] = true
      return copia
    })
    return null
  }, [errosDe, esquema, valores])

  const submeter = useCallback(
    async (aoSubmeter: (dados: z.infer<Esquema>) => Promise<void> | void) => {
      const dados = validar()
      if (!dados) return false
      setASubmeter(true)
      try {
        await aoSubmeter(dados)
        return true
      } finally {
        setASubmeter(false)
      }
    },
    [validar],
  )

  const reiniciar = useCallback(
    (novos?: Valores) => {
      setValores(novos ?? inicial)
      setErros({})
      setTocados({})
    },
    [inicial],
  )

  const valido = useMemo(() => esquema.safeParse(valores).success, [esquema, valores])

  return {
    valores,
    erros,
    tocados,
    aSubmeter,
    valido,
    definir,
    aoSairDoCampo,
    validar,
    submeter,
    reiniciar,
    setValores,
  }
}
