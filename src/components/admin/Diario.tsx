import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import { EstadoVazio } from '@/components/ui/Estados'
import { formatarDataHora } from '@/lib/format'
import { mensagemErro, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { ObraDiarioRow } from '@/types/database'

/** O diário é um registo acumulado: não há editar nem apagar, nem na base de dados nem aqui. */
export default function Diario({ obraId }: { obraId: string }) {
  const { perfil } = useAuth()
  const [entradas, setEntradas] = useState<ObraDiarioRow[]>([])
  const [texto, setTexto] = useState('')
  const [aGravar, setAGravar] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('obras_diario')
      .select('*')
      .eq('obra_id', obraId)
      .order('criado_em', { ascending: false })
    if (error) {
      toast.error(`Não foi possível carregar o diário. ${mensagemErro(error)}`)
      return
    }
    setEntradas(data ?? [])
  }, [obraId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function registar() {
    const conteudo = texto.trim()
    if (conteudo.length < 3) {
      toast.error('Escreva a entrada antes de registar.')
      return
    }
    setAGravar(true)
    const { error } = await supabase.from('obras_diario').insert({
      obra_id: obraId,
      autor_id: perfil?.id ?? null,
      autor_nome: perfil?.nome ?? 'ALC',
      texto: conteudo,
    })
    setAGravar(false)
    if (error) {
      toast.error(`Não foi possível registar. ${mensagemErro(error)}`)
      return
    }
    setTexto('')
    void carregar()
  }

  return (
    <div className="space-y-6">
      <div>
        <Textarea
          rows={3}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="O que aconteceu hoje na obra…"
        />
        <Button className="mt-2" ocupado={aGravar} onClick={() => void registar()}>
          Registar entrada
        </Button>
      </div>

      {entradas.length === 0 ? (
        <EstadoVazio titulo="Ainda não há entradas no diário." />
      ) : (
        <ol className="space-y-3">
          {entradas.map((entrada) => (
            <li key={entrada.id} className="border-l-2 border-alc-rose-dark bg-white p-4">
              <p className="whitespace-pre-line text-sm text-alc-black">{entrada.texto}</p>
              <p className="mt-2 text-xs text-alc-ink">
                {entrada.autor_nome} · {formatarDataHora(entrada.criado_em)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
