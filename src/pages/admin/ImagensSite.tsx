import { useRef, useState } from 'react'
import { ImagePlus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Input from '@/components/ui/Input'
import { EstadoErro, Esqueleto } from '@/components/ui/Estados'
import {
  reporImagemSite,
  substituirImagemSite,
  useImagensSite,
} from '@/lib/hooks/useImagensSite'
import { tipoAceite } from '@/lib/imagens'
import type { ImagemSiteResolvida } from '@/lib/imagensSite'
import { useSeo } from '@/lib/useSeo'

export default function ImagensSite() {
  useSeo({ titulo: 'Imagens do site — ALC', descricao: 'Fotografias do site público.', naoIndexar: true })

  const { imagens, aCarregar, erro, recarregar } = useImagensSite()

  return (
    <>
      <div className="space-y-4 p-4 md:p-6">
        <p className="text-sm text-alc-ink">
          Troque as fotografias da página inicial quando quiser. O portefólio continua a gerir-se
          em cada obra.
        </p>

        {erro ? <EstadoErro mensagem={erro} aoRepetir={() => void recarregar()} /> : null}

        {aCarregar ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((indice) => (
              <Esqueleto key={indice} className="h-64 w-full" />
            ))}
          </div>
        ) : null}

        {!aCarregar ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {imagens.map((imagem) => (
              <li key={imagem.chave}>
                <CartaoImagem imagem={imagem} aoAtualizar={() => void recarregar()} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  )
}

function CartaoImagem({
  imagem,
  aoAtualizar,
}: {
  imagem: ImagemSiteResolvida
  aoAtualizar: () => void
}) {
  const ficheiroRef = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState(imagem.texto_alternativo)
  const [aGuardar, setAGuardar] = useState(false)

  async function aoEscolher(lista: FileList | null) {
    const ficheiro = lista?.[0]
    if (!ficheiro) return
    if (!tipoAceite(ficheiro)) {
      toast.error('Este tipo de ficheiro não é aceite. Use JPEG, PNG ou WebP.')
      return
    }
    setAGuardar(true)
    const falha = await substituirImagemSite(imagem, ficheiro, texto)
    setAGuardar(false)
    if (ficheiroRef.current) ficheiroRef.current.value = ''
    if (falha) {
      toast.error(`Não foi possível guardar a imagem. ${falha}`)
      return
    }
    toast.success('Imagem atualizada. Já aparece no site.')
    aoAtualizar()
  }

  async function repor() {
    setAGuardar(true)
    const falha = await reporImagemSite(imagem)
    setAGuardar(false)
    if (falha) {
      toast.error(`Não foi possível repor a imagem original. ${falha}`)
      return
    }
    setTexto(imagem.textoAlternativo)
    toast.success('Voltou a imagem de partida.')
    aoAtualizar()
  }

  return (
    <article className="border border-alc-line bg-white p-4">
      <div className="aspect-[4/3] overflow-hidden bg-alc-grey">
        <img
          src={imagem.url}
          alt={imagem.texto_alternativo}
          className="size-full object-cover"
        />
      </div>
      <h2 className="mt-3 font-display text-xl text-alc-black">{imagem.rotulo}</h2>
      <p className="mt-1 text-sm text-alc-ink">{imagem.onde}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-alc-rose-deep">
        {imagem.personalizada ? 'Fotografia da equipa' : 'Imagem de partida'}
      </p>

      <div className="mt-4">
        <Campo
          etiqueta="Texto alternativo"
          ajuda="Descreve a fotografia para quem não a vê. Não ponha nomes de clientes."
        >
          <Input value={texto} onChange={(evento) => setTexto(evento.target.value)} />
        </Campo>
      </div>

      <input
        ref={ficheiroRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(evento) => void aoEscolher(evento.target.files)}
      />

      <div className="mt-4 flex flex-col gap-2">
        <Button
          className="toque w-full"
          ocupado={aGuardar}
          onClick={() => ficheiroRef.current?.click()}
        >
          <ImagePlus aria-hidden className="size-4" />
          Alterar fotografia
        </Button>
        {imagem.personalizada ? (
          <Button
            className="toque w-full"
            variante="secundario"
            ocupado={aGuardar}
            onClick={() => void repor()}
          >
            <RotateCcw aria-hidden className="size-4" />
            Repor original
          </Button>
        ) : null}
      </div>
    </article>
  )
}
