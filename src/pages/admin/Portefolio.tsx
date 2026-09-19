import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowDown, ArrowUp, Eye, EyeOff, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmarDialog from '@/components/ui/ConfirmarDialog'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import Cabecalho from '@/components/admin/Cabecalho'
import FormularioObraPublica from '@/components/admin/FormularioObraPublica'
import { usePortefolio } from '@/lib/hooks/usePortefolio'
import { alternarVisibilidadeObra, apagarObraPublica, moverObra, type ObraPublicaComImagens } from '@/lib/portefolio'
import { ROTULO_INTERVENCAO } from '@/lib/schemas/comum'
import { useSeo } from '@/lib/useSeo'
import type { ObraPublicaRow } from '@/types/database'

export default function Portefolio() {
  useSeo({
    titulo: 'Portefólio — ALC',
    descricao: 'Gestão das fotografias do portefólio público.',
    naoIndexar: true,
  })

  const { obras, aCarregar, erro, recarregar, setObras } = usePortefolio()
  const [emEdicao, setEmEdicao] = useState<ObraPublicaRow | null>(null)
  const [formAberto, setFormAberto] = useState(false)
  const [apagarAlvo, setApagarAlvo] = useState<ObraPublicaComImagens | null>(null)
  const [aApagar, setAApagar] = useState(false)

  async function alternarVisivel(obra: ObraPublicaComImagens) {
    const anterior = obra.visivel
    setObras((atuais) =>
      atuais.map((item) => (item.id === obra.id ? { ...item, visivel: !anterior } : item)),
    )
    const erroMudanca = await alternarVisibilidadeObra(obra.id, !anterior)
    if (erroMudanca) {
      setObras((atuais) =>
        atuais.map((item) => (item.id === obra.id ? { ...item, visivel: anterior } : item)),
      )
      toast.error(`Não foi possível atualizar. ${erroMudanca}`)
    }
  }

  async function mover(obra: ObraPublicaComImagens, direcao: -1 | 1) {
    const ordenadas = [...obras].sort((a, b) => a.ordem - b.ordem)
    const vizinho = ordenadas[ordenadas.findIndex((item) => item.id === obra.id) + direcao]
    if (!vizinho) return

    setObras((atuais) =>
      atuais.map((item) => {
        if (item.id === obra.id) return { ...item, ordem: vizinho.ordem }
        if (item.id === vizinho.id) return { ...item, ordem: obra.ordem }
        return item
      }),
    )
    const erroMover = await moverObra(obras, obra.id, direcao)
    if (erroMover) {
      toast.error(`Não foi possível reordenar. ${erroMover}`)
      void recarregar()
    }
  }

  async function apagar() {
    if (!apagarAlvo) return
    setAApagar(true)
    const erroApagar = await apagarObraPublica(apagarAlvo)
    setAApagar(false)
    if (erroApagar) {
      toast.error(`Não foi possível apagar. ${erroApagar}`)
      return
    }
    setApagarAlvo(null)
    toast.success('Obra apagada.')
    void recarregar()
  }

  const ordenadas = [...obras].sort((a, b) => a.ordem - b.ordem)

  return (
    <>
      <Cabecalho
        titulo="Portefólio"
        subtitulo={`${obras.length} ${obras.length === 1 ? 'obra' : 'obras'} · o que aparece na página inicial`}
        acoes={
          <Button
            tamanho="sm"
            onClick={() => {
              setEmEdicao(null)
              setFormAberto(true)
            }}
          >
            <Plus aria-hidden className="size-4" />
            Nova obra
          </Button>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        <p className="text-sm text-alc-ink">
          Crie uma obra, carregue fotografias do telemóvel ou do computador e mostre-a quando
          estiver pronta. Uma obra nova começa oculta.
        </p>

        {erro ? <EstadoErro mensagem={erro} aoRepetir={() => void recarregar()} /> : null}

        {aCarregar ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((indice) => (
              <Esqueleto key={indice} className="h-72 w-full" />
            ))}
          </div>
        ) : null}

        {!aCarregar && !erro && ordenadas.length === 0 ? (
          <EstadoVazio
            titulo="Ainda não há obras no portefólio."
            descricao="Crie a primeira e comece a carregar fotografias."
            acao={
              <Button
                onClick={() => {
                  setEmEdicao(null)
                  setFormAberto(true)
                }}
              >
                Nova obra
              </Button>
            }
          />
        ) : null}

        {!aCarregar && ordenadas.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordenadas.map((obra, indice) => (
              <li key={obra.id} className="flex flex-col border border-alc-line bg-white">
                <Link to={`/admin/portefolio/${obra.id}`} className="block">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-alc-grey">
                    {obra.imagem_capa ?? obra.imagens[0]?.url ? (
                      <img
                        src={obra.imagem_capa ?? obra.imagens[0]?.url}
                        alt={obra.titulo}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-alc-ink/40">
                        <ImageOff aria-hidden className="size-8" />
                      </div>
                    )}
                    {!obra.visivel ? (
                      <span className="absolute left-2 top-2">
                        <Badge tom="escuro">Oculta</Badge>
                      </span>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-medium text-alc-black">{obra.titulo}</p>
                      <Badge tom="rosa" className="shrink-0">
                        {ROTULO_INTERVENCAO[obra.tipo_intervencao]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-alc-ink">
                      {obra.localidade ?? '—'} · {obra.imagens.length}{' '}
                      {obra.imagens.length === 1 ? 'fotografia' : 'fotografias'}
                    </p>
                  </div>
                </Link>

                <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-alc-line p-2">
                  <button
                    type="button"
                    onClick={() => void alternarVisivel(obra)}
                    className="toque flex items-center gap-1.5 rounded-[2px] px-2 text-sm text-alc-ink hover:bg-alc-grey"
                  >
                    {obra.visivel ? (
                      <EyeOff aria-hidden className="size-4" />
                    ) : (
                      <Eye aria-hidden className="size-4" />
                    )}
                    {obra.visivel ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmEdicao(obra)
                      setFormAberto(true)
                    }}
                    className="toque flex items-center gap-1.5 rounded-[2px] px-2 text-sm text-alc-ink hover:bg-alc-grey"
                  >
                    <Pencil aria-hidden className="size-4" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setApagarAlvo(obra)}
                    className="toque flex items-center gap-1.5 rounded-[2px] px-2 text-sm text-alc-rose-deep hover:bg-alc-rose-light"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    Apagar
                  </button>
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Mover para cima"
                      disabled={indice === 0}
                      onClick={() => void mover(obra, -1)}
                      className="toque flex items-center justify-center rounded-[2px] text-alc-ink hover:bg-alc-grey disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ArrowUp aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Mover para baixo"
                      disabled={indice === ordenadas.length - 1}
                      onClick={() => void mover(obra, 1)}
                      className="toque flex items-center justify-center rounded-[2px] text-alc-ink hover:bg-alc-grey disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ArrowDown aria-hidden className="size-4" />
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <FormularioObraPublica
        key={emEdicao?.id ?? 'nova'}
        aberto={formAberto}
        obra={emEdicao}
        aoFechar={() => setFormAberto(false)}
        aoGuardar={() => void recarregar()}
      />

      <ConfirmarDialog
        aberto={apagarAlvo !== null}
        aoMudar={(aberto) => {
          if (!aberto) setApagarAlvo(null)
        }}
        titulo="Apagar obra"
        descricao={
          apagarAlvo
            ? `"${apagarAlvo.titulo}" e as suas ${apagarAlvo.imagens.length} fotografias vão ser apagadas.`
            : ''
        }
        ocupado={aApagar}
        aoConfirmar={() => void apagar()}
      />
    </>
  )
}
