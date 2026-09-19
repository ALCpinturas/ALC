import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { esquemaCliente } from '@/lib/schemas/gestao'
import { mensagemErro, supabase } from '@/lib/supabase'
import { useFormulario } from '@/lib/useFormulario'
import type { ClienteRow } from '@/types/database'

const ORIGENS = [
  { valor: 'telefone', rotulo: 'Telefone' },
  { valor: 'recomendacao', rotulo: 'Recomendação' },
  { valor: 'formulario', rotulo: 'Formulário do site' },
  { valor: 'calculadora', rotulo: 'Calculadora do site' },
  { valor: 'outro', rotulo: 'Outro' },
]

type Valores = {
  nome: string
  telefone: string
  email: string
  nif: string
  morada: string
  codigo_postal: string
  localidade: string
  notas: string
  origem: string
}

function valoresDe(cliente: ClienteRow | null): Valores {
  return {
    nome: cliente?.nome ?? '',
    telefone: cliente?.telefone ?? '',
    email: cliente?.email ?? '',
    nif: cliente?.nif ?? '',
    morada: cliente?.morada ?? '',
    codigo_postal: cliente?.codigo_postal ?? '',
    localidade: cliente?.localidade ?? '',
    notas: cliente?.notas ?? '',
    origem: cliente?.origem ?? 'telefone',
  }
}

interface FormularioClienteProps {
  aberto: boolean
  aoFechar: () => void
  cliente: ClienteRow | null
  aoGuardar: (id: string) => void
}

export default function FormularioCliente({
  aberto,
  aoFechar,
  cliente,
  aoGuardar,
}: FormularioClienteProps) {
  const formulario = useFormulario(esquemaCliente, valoresDe(cliente))

  async function guardar() {
    await formulario.submeter(async (dados) => {
      const resposta = cliente
        ? await supabase.from('clientes').update(dados).eq('id', cliente.id).select('id').single()
        : await supabase.from('clientes').insert(dados).select('id').single()

      if (resposta.error || !resposta.data) {
        toast.error(`Não foi possível guardar o cliente. ${mensagemErro(resposta.error)}`)
        return
      }
      toast.success(cliente ? 'Cliente atualizado.' : 'Cliente criado.')
      aoGuardar(resposta.data.id)
      aoFechar()
    })
  }

  return (
    <Dialog
      aberto={aberto}
      aoMudar={(estado) => {
        if (!estado) aoFechar()
      }}
      titulo={cliente ? 'Editar cliente' : 'Novo cliente'}
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
        <Campo etiqueta="Nome" erro={formulario.erros.nome} obrigatorio>
          <Input
            value={formulario.valores.nome}
            onChange={(evento) => formulario.definir('nome', evento.target.value)}
            onBlur={() => formulario.aoSairDoCampo('nome')}
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Telefone" erro={formulario.erros.telefone}>
            <Input
              type="tel"
              inputMode="tel"
              value={formulario.valores.telefone}
              onChange={(evento) => formulario.definir('telefone', evento.target.value)}
              onBlur={() => formulario.aoSairDoCampo('telefone')}
            />
          </Campo>
          <Campo etiqueta="Email" erro={formulario.erros.email}>
            <Input
              type="email"
              inputMode="email"
              value={formulario.valores.email}
              onChange={(evento) => formulario.definir('email', evento.target.value)}
              onBlur={() => formulario.aoSairDoCampo('email')}
            />
          </Campo>
          <Campo etiqueta="NIF" erro={formulario.erros.nif}>
            <Input
              inputMode="numeric"
              maxLength={9}
              value={formulario.valores.nif}
              onChange={(evento) => formulario.definir('nif', evento.target.value)}
              onBlur={() => formulario.aoSairDoCampo('nif')}
            />
          </Campo>
          <Campo etiqueta="Origem">
            <Select
              valor={formulario.valores.origem}
              aoMudar={(valor) => formulario.definir('origem', valor)}
              opcoes={ORIGENS}
            />
          </Campo>
        </div>
        <Campo etiqueta="Morada" erro={formulario.erros.morada}>
          <Input
            value={formulario.valores.morada}
            onChange={(evento) => formulario.definir('morada', evento.target.value)}
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Código postal" erro={formulario.erros.codigo_postal} ajuda="Formato 0000-000">
            <Input
              inputMode="numeric"
              maxLength={8}
              value={formulario.valores.codigo_postal}
              onChange={(evento) => formulario.definir('codigo_postal', evento.target.value)}
              onBlur={() => formulario.aoSairDoCampo('codigo_postal')}
            />
          </Campo>
          <Campo etiqueta="Localidade" erro={formulario.erros.localidade}>
            <Input
              value={formulario.valores.localidade}
              onChange={(evento) => formulario.definir('localidade', evento.target.value)}
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
