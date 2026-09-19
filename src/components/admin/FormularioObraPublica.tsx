import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { atualizarObraPublica, criarObraPublica } from '@/lib/portefolio'
import { esquemaObraPublica } from '@/lib/schemas/gestao'
import { ROTULO_INTERVENCAO, TIPOS_INTERVENCAO } from '@/lib/schemas/comum'
import { useFormulario } from '@/lib/useFormulario'
import type { ObraPublicaRow } from '@/types/database'

type Valores = {
  titulo: string
  localidade: string
  tipo_intervencao: string
  descricao: string
}

interface FormularioObraPublicaProps {
  aberto: boolean
  aoFechar: () => void
  obra: ObraPublicaRow | null
  aoGuardar: (id: string) => void
}

export default function FormularioObraPublica({
  aberto,
  aoFechar,
  obra,
  aoGuardar,
}: FormularioObraPublicaProps) {
  const formulario = useFormulario<typeof esquemaObraPublica, Valores>(esquemaObraPublica, {
    titulo: obra?.titulo ?? '',
    localidade: obra?.localidade ?? '',
    tipo_intervencao: obra?.tipo_intervencao ?? '',
    descricao: obra?.descricao ?? '',
  })

  async function guardar() {
    await formulario.submeter(async (dados) => {
      if (obra) {
        const erro = await atualizarObraPublica(obra.id, dados)
        if (erro) {
          toast.error(`Não foi possível guardar a obra. ${erro}`)
          return
        }
        toast.success('Obra atualizada.')
        aoGuardar(obra.id)
        aoFechar()
        return
      }

      const resultado = await criarObraPublica(dados)
      if ('erro' in resultado) {
        toast.error(`Não foi possível criar a obra. ${resultado.erro}`)
        return
      }
      toast.success('Obra criada. Fica oculta até adicionar fotografias e mostrar no site.')
      aoGuardar(resultado.id)
      aoFechar()
    })
  }

  return (
    <Dialog
      aberto={aberto}
      aoMudar={(estado) => {
        if (!estado) aoFechar()
      }}
      titulo={obra ? 'Editar obra' : 'Nova obra no portefólio'}
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
        <Campo etiqueta="Título" erro={formulario.erros.titulo} obrigatorio>
          <Input
            value={formulario.valores.titulo}
            onChange={(evento) => formulario.definir('titulo', evento.target.value)}
            onBlur={() => formulario.aoSairDoCampo('titulo')}
            placeholder="Ex.: Remodelação de apartamento em Cascais"
          />
        </Campo>

        <Campo etiqueta="Tipo de trabalho" erro={formulario.erros.tipo_intervencao} obrigatorio>
          <Select
            valor={formulario.valores.tipo_intervencao}
            aoMudar={(valor) => formulario.definir('tipo_intervencao', valor)}
            marcador="Escolher tipo"
            opcoes={TIPOS_INTERVENCAO.map((tipo) => ({ valor: tipo, rotulo: ROTULO_INTERVENCAO[tipo] }))}
          />
        </Campo>

        <Campo etiqueta="Localidade" erro={formulario.erros.localidade}>
          <Input
            value={formulario.valores.localidade}
            onChange={(evento) => formulario.definir('localidade', evento.target.value)}
            placeholder="Ex.: Cascais"
          />
        </Campo>

        <Campo
          etiqueta="Descrição"
          erro={formulario.erros.descricao}
          ajuda="Aparece na ficha da obra quando alguém a abre no site. Não incluir nomes de clientes."
        >
          <Textarea
            rows={3}
            value={formulario.valores.descricao}
            onChange={(evento) => formulario.definir('descricao', evento.target.value)}
          />
        </Campo>
      </div>
    </Dialog>
  )
}
