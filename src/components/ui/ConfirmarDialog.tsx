import Button from './Button'
import Dialog from './Dialog'

interface ConfirmarDialogProps {
  aberto: boolean
  aoMudar: (aberto: boolean) => void
  titulo: string
  descricao: string
  textoConfirmar?: string
  ocupado?: boolean
  aoConfirmar: () => void
}

/** Diálogo de confirmação para ações destrutivas, em vez de window.confirm() nativo. */
export default function ConfirmarDialog({
  aberto,
  aoMudar,
  titulo,
  descricao,
  textoConfirmar = 'Apagar',
  ocupado = false,
  aoConfirmar,
}: ConfirmarDialogProps) {
  return (
    <Dialog
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={titulo}
      descricao={descricao}
      largura="sm"
      rodape={
        <>
          <Button variante="secundario" onClick={() => aoMudar(false)}>
            Cancelar
          </Button>
          <Button variante="perigo" ocupado={ocupado} onClick={aoConfirmar}>
            {textoConfirmar}
          </Button>
        </>
      }
    >
      {null}
    </Dialog>
  )
}
