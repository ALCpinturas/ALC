import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { esquemaObra } from '@/lib/schemas/gestao'
import {
  ESTADOS_OBRA,
  ROTULO_ESTADO_OBRA,
  ROTULO_INTERVENCAO,
  TIPOS_INTERVENCAO,
} from '@/lib/schemas/comum'
import { mensagemErro, supabase } from '@/lib/supabase'
import { useFormulario } from '@/lib/useFormulario'
import { cn } from '@/lib/cn'
import type { ObraRow } from '@/types/database'

type Valores = {
  cliente_id: string
  titulo: string
  morada: string
  localidade: string
  tipos_intervencao: string[]
  estado: string
  data_inicio: string
  data_fim_prevista: string
  notas: string
}

interface FormularioObraProps {
  aberto: boolean
  aoFechar: () => void
  obra: ObraRow | null
  clienteFixo?: { id: string; nome: string }
  aoGuardar: (id: string) => void
}

export default function FormularioObra({
  aberto,
  aoFechar,
  obra,
  clienteFixo,
  aoGuardar,
}: FormularioObraProps) {
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])

  const formulario = useFormulario<typeof esquemaObra, Valores>(esquemaObra, {
    cliente_id: obra?.cliente_id ?? clienteFixo?.id ?? '',
    titulo: obra?.titulo ?? '',
    morada: obra?.morada ?? '',
    localidade: obra?.localidade ?? '',
    tipos_intervencao: obra?.tipos_intervencao ?? [],
    estado: obra?.estado ?? 'proposta',
    data_inicio: obra?.data_inicio ?? '',
    data_fim_prevista: obra?.data_fim_prevista ?? '',
    notas: obra?.notas ?? '',
  })

  useEffect(() => {
    if (clienteFixo || !aberto) return
    void supabase
      .from('clientes')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setClientes(data ?? []))
  }, [aberto, clienteFixo])

  async function guardar() {
    await formulario.submeter(async (dados) => {
      const resposta = obra
        ? await supabase.from('obras').update(dados).eq('id', obra.id).select('id').single()
        : await supabase.from('obras').insert(dados).select('id').single()

      if (resposta.error || !resposta.data) {
        toast.error(`Não foi possível guardar a obra. ${mensagemErro(resposta.error)}`)
        return
      }
      toast.success(obra ? 'Obra atualizada.' : 'Obra criada.')
      aoGuardar(resposta.data.id)
      aoFechar()
    })
  }

  function alternarTipo(tipo: string) {
    const atuais = formulario.valores.tipos_intervencao
    formulario.definir(
      'tipos_intervencao',
      atuais.includes(tipo) ? atuais.filter((item) => item !== tipo) : [...atuais, tipo],
    )
  }

  return (
    <Dialog
      aberto={aberto}
      aoMudar={(estado) => {
        if (!estado) aoFechar()
      }}
      titulo={obra ? 'Editar obra' : 'Nova obra'}
      descricao={clienteFixo ? `Cliente: ${clienteFixo.nome}` : undefined}
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button ocupado={formulario.aSubmeter} onClick={() => void guardar()}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!clienteFixo ? (
          <Campo etiqueta="Cliente" erro={formulario.erros.cliente_id} obrigatorio>
            <Select
              valor={formulario.valores.cliente_id}
              aoMudar={(valor) => formulario.definir('cliente_id', valor)}
              marcador="Escolher cliente"
              opcoes={clientes.map((cliente) => ({ valor: cliente.id, rotulo: cliente.nome }))}
            />
          </Campo>
        ) : null}

        <Campo etiqueta="Título da obra" erro={formulario.erros.titulo} obrigatorio>
          <Input
            value={formulario.valores.titulo}
            onChange={(evento) => formulario.definir('titulo', evento.target.value)}
            onBlur={() => formulario.aoSairDoCampo('titulo')}
          />
        </Campo>

        <div>
          <p className="mb-2 text-sm font-medium text-alc-black">
            Tipos de trabalho<span className="text-alc-rose-dark"> *</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TIPOS_INTERVENCAO.map((tipo) => {
              const escolhido = formulario.valores.tipos_intervencao.includes(tipo)
              return (
                <button
                  key={tipo}
                  type="button"
                  aria-pressed={escolhido}
                  onClick={() => alternarTipo(tipo)}
                  className={cn(
                    'toque rounded-[2px] border px-3 text-left text-sm',
                    escolhido ? 'border-alc-rose-dark bg-alc-rose-light' : 'border-alc-line',
                  )}
                >
                  {ROTULO_INTERVENCAO[tipo]}
                </button>
              )
            })}
          </div>
          {formulario.erros.tipos_intervencao ? (
            <p role="alert" className="mt-2 text-sm font-medium text-alc-rose-deep">
              {formulario.erros.tipos_intervencao}
            </p>
          ) : null}
        </div>

        <Campo etiqueta="Morada" erro={formulario.erros.morada}>
          <Input
            value={formulario.valores.morada}
            onChange={(evento) => formulario.definir('morada', evento.target.value)}
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Localidade" erro={formulario.erros.localidade}>
            <Input
              value={formulario.valores.localidade}
              onChange={(evento) => formulario.definir('localidade', evento.target.value)}
            />
          </Campo>
          <Campo etiqueta="Estado">
            <Select
              valor={formulario.valores.estado}
              aoMudar={(valor) => formulario.definir('estado', valor)}
              opcoes={ESTADOS_OBRA.map((estado) => ({
                valor: estado,
                rotulo: ROTULO_ESTADO_OBRA[estado],
              }))}
            />
          </Campo>
          <Campo etiqueta="Início" erro={formulario.erros.data_inicio}>
            <Input
              type="date"
              value={formulario.valores.data_inicio}
              onChange={(evento) => formulario.definir('data_inicio', evento.target.value)}
            />
          </Campo>
          <Campo etiqueta="Fim previsto" erro={formulario.erros.data_fim_prevista}>
            <Input
              type="date"
              value={formulario.valores.data_fim_prevista}
              onChange={(evento) => formulario.definir('data_fim_prevista', evento.target.value)}
            />
          </Campo>
        </div>

        <Campo etiqueta="Notas" erro={formulario.erros.notas}>
          <Textarea
            rows={3}
            value={formulario.valores.notas}
            onChange={(evento) => formulario.definir('notas', evento.target.value)}
          />
        </Campo>
      </div>
    </Dialog>
  )
}
