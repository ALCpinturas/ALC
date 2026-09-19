import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  RotateCw,
  Star,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmarDialog from '@/components/ui/ConfirmarDialog'
import Dialog from '@/components/ui/Dialog'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import Cabecalho from '@/components/admin/Cabecalho'
import FormularioObraPublica from '@/components/admin/FormularioObraPublica'
import { filaUploadPortefolio, type ItemFilaPortefolio } from '@/lib/filaUploadPortefolio'
import { useObraPublica } from '@/lib/hooks/usePortefolio'
import { tipoAceite } from '@/lib/imagens'
import {
  alternarVisibilidadeImagem,
  alternarVisibilidadeObra,
  apagarImagemPortefolio,
  atualizarImagemPortefolio,
  definirCapa,
  moverImagemPortefolio,
} from '@/lib/portefolio'
import { ROTULO_INTERVENCAO } from '@/lib/schemas/comum'
import { useSeo } from '@/lib/useSeo'
import { cn } from '@/lib/cn'
import type { CategoriaFoto, ObraPublicaImagemRow } from '@/types/database'

const CATEGORIAS: { valor: string; rotulo: string }[] = [
  { valor: 'sem', rotulo: 'Sem categoria' },
  { valor: 'antes', rotulo: 'Antes' },
  { valor: 'durante', rotulo: 'Durante' },
  { valor: 'depois', rotulo: 'Depois' },
]

export default function PortefolioObra() {
  const { id } = useParams<{ id: string }>()
  const { obra, aCarregar, erro, recarregar, setObra } = useObraPublica(id)
  const [editar, setEditar] = useState(false)
  const [fila, setFila] = useState<ItemFilaPortefolio[]>([])
  const [selecionada, setSelecionada] = useState<ObraPublicaImagemRow | null>(null)
  const [legenda, setLegenda] = useState('')
  const [categoria, setCategoria] = useState('sem')
  const [aGuardarImagem, setAGuardarImagem] = useState(false)
  const [confirmarApagar, setConfirmarApagar] = useState(false)
  const [aApagar, setAApagar] = useState(false)

  useSeo({
    titulo: obra ? `${obra.titulo} — Portefólio — ALC` : 'Portefólio — ALC',
    descricao: 'Gestão das fotografias desta obra no portefólio público.',
    naoIndexar: true,
  })

  useEffect(() => filaUploadPortefolio.subscrever(setFila), [])

  const desteObra = fila.filter((item) => item.obraId === id)

  useEffect(() => {
    if (desteObra.length > 0 && desteObra.every((item) => item.estado !== 'a_enviar')) {
      void recarregar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fila])

  const aceitarFicheiros = useCallback(
    (lista: FileList | null) => {
      if (!lista || !id) return
      const validos = Array.from(lista).filter((ficheiro) => {
        if (tipoAceite(ficheiro)) return true
        toast.error(`"${ficheiro.name}" não é um formato aceite.`)
        return false
      })
      if (validos.length > 0) filaUploadPortefolio.adicionar(id, validos)
    },
    [id],
  )

  async function alternarVisivelObra() {
    if (!obra) return
    const anterior = obra.visivel
    setObra({ ...obra, visivel: !anterior })
    const erroMudanca = await alternarVisibilidadeObra(obra.id, !anterior)
    if (erroMudanca) {
      setObra({ ...obra, visivel: anterior })
      toast.error(`Não foi possível atualizar. ${erroMudanca}`)
    } else {
      toast.success(!anterior ? 'Obra visível no site.' : 'Obra ocultada do site.')
    }
  }

  function abrirImagem(imagem: ObraPublicaImagemRow) {
    setSelecionada(imagem)
    setLegenda(imagem.legenda ?? '')
    setCategoria(imagem.categoria ?? 'sem')
  }

  async function guardarImagem() {
    if (!selecionada) return
    setAGuardarImagem(true)
    const erroGuardar = await atualizarImagemPortefolio(selecionada.id, {
      legenda: legenda.trim() || null,
      categoria: categoria === 'sem' ? null : (categoria as CategoriaFoto),
    })
    setAGuardarImagem(false)
    if (erroGuardar) {
      toast.error(`Não foi possível guardar. ${erroGuardar}`)
      return
    }
    setSelecionada(null)
    void recarregar()
  }

  async function ocultarOuMostrar(imagem: ObraPublicaImagemRow) {
    if (!obra) return
    const novaVisibilidade = !imagem.visivel
    const erroMudanca = await alternarVisibilidadeImagem(imagem.id, novaVisibilidade)
    if (erroMudanca) {
      toast.error(`Não foi possível atualizar. ${erroMudanca}`)
      return
    }
    // Uma fotografia oculta não pode continuar a ser a capa pública da obra.
    if (!novaVisibilidade && obra.imagem_capa === imagem.url) {
      await definirCapa(obra.id, null)
    }
    setSelecionada({ ...imagem, visivel: novaVisibilidade })
    void recarregar()
  }

  async function tornarCapa(imagem: ObraPublicaImagemRow) {
    if (!obra) return
    const erroCapa = await definirCapa(obra.id, imagem.url)
    if (erroCapa) {
      toast.error(`Não foi possível definir a capa. ${erroCapa}`)
      return
    }
    setObra({ ...obra, imagem_capa: imagem.url })
    toast.success('Capa da obra atualizada.')
  }

  async function mover(imagem: ObraPublicaImagemRow, direcao: -1 | 1) {
    if (!obra) return
    const erroMover = await moverImagemPortefolio(obra.imagens, imagem.id, direcao)
    if (erroMover) toast.error(`Não foi possível reordenar. ${erroMover}`)
    void recarregar()
  }

  async function apagar() {
    if (!obra || !selecionada) return
    setAApagar(true)
    const erroApagar = await apagarImagemPortefolio(selecionada)
    setAApagar(false)
    if (erroApagar) {
      toast.error(`Não foi possível apagar. ${erroApagar}`)
      return
    }
    // Sem isto a obra ficava com a capa a apontar para um ficheiro já apagado do balde.
    if (obra.imagem_capa === selecionada.url) {
      await definirCapa(obra.id, null)
    }
    setConfirmarApagar(false)
    setSelecionada(null)
    void recarregar()
  }

  if (aCarregar) {
    return (
      <div className="space-y-3 p-4 md:p-6">
        <Esqueleto className="h-8 w-56" />
        <Esqueleto className="h-40 w-full" />
      </div>
    )
  }

  if (erro) return <EstadoErro className="m-4" mensagem={erro} aoRepetir={() => void recarregar()} />
  if (!obra) return <EstadoVazio className="m-4" titulo="Obra não encontrada." />

  const imagemSelecionadaIndice = selecionada
    ? obra.imagens.findIndex((item) => item.id === selecionada.id)
    : -1

  return (
    <>
      <Cabecalho
        titulo={obra.titulo}
        subtitulo={`${ROTULO_INTERVENCAO[obra.tipo_intervencao]}${obra.localidade ? ` · ${obra.localidade}` : ''}`}
        voltarPara="/admin/portefolio"
        acoes={
          <>
            <Button variante="secundario" tamanho="sm" onClick={() => setEditar(true)}>
              <Pencil aria-hidden className="size-4" />
              Editar
            </Button>
            <Button tamanho="sm" onClick={() => void alternarVisivelObra()}>
              {obra.visivel ? (
                <EyeOff aria-hidden className="size-4" />
              ) : (
                <Eye aria-hidden className="size-4" />
              )}
              {obra.visivel ? 'Ocultar do site' : 'Mostrar no site'}
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tom={obra.visivel ? 'rosa' : 'escuro'}>{obra.visivel ? 'Visível no site' : 'Oculta'}</Badge>
          {obra.descricao ? <p className="text-sm text-alc-ink">{obra.descricao}</p> : null}
        </div>

        {!obra.visivel && obra.imagens.length === 0 ? (
          <p className="border-l-2 border-alc-rose-dark bg-alc-rose-light p-3 text-sm">
            Carregue pelo menos uma fotografia e depois mostre esta obra no site.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="toque flex cursor-pointer items-center justify-center gap-2 border border-alc-rose-dark bg-alc-rose-dark px-4 text-sm font-medium uppercase tracking-wide text-white">
            <Camera aria-hidden className="size-5" />
            Tirar fotografia
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(evento) => {
                aceitarFicheiros(evento.target.files)
                evento.target.value = ''
              }}
            />
          </label>
          <label className="toque flex cursor-pointer items-center justify-center gap-2 border border-alc-black px-4 text-sm font-medium uppercase tracking-wide">
            <ImagePlus aria-hidden className="size-5" />
            Escolher ficheiros
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(evento) => {
                aceitarFicheiros(evento.target.files)
                evento.target.value = ''
              }}
            />
          </label>
        </div>

        {desteObra.filter((item) => item.estado !== 'concluido').length > 0 ? (
          <ul className="space-y-2 border border-alc-line bg-white p-3">
            {desteObra
              .filter((item) => item.estado !== 'concluido')
              .map((item) => (
                <li key={item.id} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{item.nome}</span>
                    {item.estado === 'falhado' ? (
                      <button
                        type="button"
                        onClick={() => filaUploadPortefolio.repetir(item.id)}
                        className="flex items-center gap-1 text-alc-rose-deep"
                      >
                        <RotateCw aria-hidden className="size-4" />
                        Tentar novamente
                      </button>
                    ) : (
                      <span className="text-alc-ink">{item.progresso}%</span>
                    )}
                  </div>
                  <div className="mt-1 h-1 w-full bg-alc-grey">
                    <div
                      className={cn('h-full', item.estado === 'falhado' ? 'bg-alc-rose-deep' : 'bg-alc-rose-dark')}
                      style={{ width: `${item.estado === 'falhado' ? 100 : item.progresso}%` }}
                    />
                  </div>
                  {item.erro ? <p className="mt-1 text-xs text-alc-rose-deep">{item.erro}</p> : null}
                </li>
              ))}
          </ul>
        ) : null}

        {obra.imagens.length === 0 ? (
          <EstadoVazio titulo="Ainda não há fotografias." descricao="Carregue as primeiras acima." />
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {obra.imagens.map((imagem) => (
              <li key={imagem.id}>
                <button
                  type="button"
                  onClick={() => abrirImagem(imagem)}
                  className="relative block w-full"
                >
                  <img
                    src={imagem.url}
                    alt={imagem.legenda ?? 'Fotografia da obra'}
                    className={cn(
                      'aspect-square w-full object-cover',
                      !imagem.visivel && 'opacity-40',
                    )}
                    loading="lazy"
                    decoding="async"
                  />
                  {obra.imagem_capa === imagem.url ? (
                    <span className="absolute left-1 top-1 flex items-center justify-center rounded-full bg-white/90 p-1">
                      <Star aria-hidden className="size-3.5 fill-alc-rose-dark text-alc-rose-dark" />
                    </span>
                  ) : null}
                  {!imagem.visivel ? (
                    <span className="absolute inset-x-1 bottom-1">
                      <Badge tom="escuro">Oculta</Badge>
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        aberto={selecionada !== null}
        aoMudar={(aberto) => {
          if (!aberto) setSelecionada(null)
        }}
        titulo="Fotografia"
        rodape={
          selecionada ? (
            <>
              <Button variante="perigo" onClick={() => setConfirmarApagar(true)}>
                <Trash2 aria-hidden className="size-4" />
                Apagar
              </Button>
              <Button ocupado={aGuardarImagem} onClick={() => void guardarImagem()}>
                Guardar
              </Button>
            </>
          ) : null
        }
      >
        {selecionada ? (
          <div className="space-y-4">
            <img
              src={selecionada.url}
              alt={selecionada.legenda ?? 'Fotografia da obra'}
              className="max-h-[40dvh] w-full object-contain"
            />

            <div className="flex flex-wrap gap-2">
              <Button
                variante="secundario"
                tamanho="sm"
                onClick={() => void ocultarOuMostrar(selecionada)}
              >
                {selecionada.visivel ? (
                  <EyeOff aria-hidden className="size-4" />
                ) : (
                  <Eye aria-hidden className="size-4" />
                )}
                {selecionada.visivel ? 'Ocultar' : 'Mostrar'}
              </Button>
              <Button
                variante="secundario"
                tamanho="sm"
                disabled={obra.imagem_capa === selecionada.url}
                onClick={() => void tornarCapa(selecionada)}
              >
                <Star aria-hidden className="size-4" />
                Definir como capa
              </Button>
              <Button
                variante="secundario"
                tamanho="sm"
                disabled={imagemSelecionadaIndice <= 0}
                onClick={() => void mover(selecionada, -1)}
              >
                <ArrowUp aria-hidden className="size-4" />
              </Button>
              <Button
                variante="secundario"
                tamanho="sm"
                disabled={imagemSelecionadaIndice === -1 || imagemSelecionadaIndice >= obra.imagens.length - 1}
                onClick={() => void mover(selecionada, 1)}
              >
                <ArrowDown aria-hidden className="size-4" />
              </Button>
            </div>

            <div>
              <p className="mb-2 text-sm text-alc-ink">Categoria</p>
              <Select valor={categoria} aoMudar={setCategoria} opcoes={CATEGORIAS} />
            </div>
            <div>
              <p className="mb-2 text-sm text-alc-ink">Legenda</p>
              <Textarea rows={2} value={legenda} onChange={(evento) => setLegenda(evento.target.value)} />
            </div>
          </div>
        ) : null}
      </Dialog>

      <FormularioObraPublica
        aberto={editar}
        obra={obra}
        aoFechar={() => setEditar(false)}
        aoGuardar={() => void recarregar()}
      />

      <ConfirmarDialog
        aberto={confirmarApagar}
        aoMudar={setConfirmarApagar}
        titulo="Apagar fotografia"
        descricao="Esta fotografia vai ser apagada. A ação não pode ser revertida."
        ocupado={aApagar}
        aoConfirmar={() => void apagar()}
      />
    </>
  )
}
