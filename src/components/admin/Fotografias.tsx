import { useCallback, useEffect, useState } from 'react'
import { Camera, ImagePlus, RotateCw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import ConfirmarDialog from '@/components/ui/ConfirmarDialog'
import { EstadoVazio } from '@/components/ui/Estados'
import { filaUpload, type ItemFila } from '@/lib/filaUpload'
import { tipoAceite } from '@/lib/imagens'
import { mensagemErro, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import type { CategoriaFoto, ObraFotografiaRow } from '@/types/database'

const CATEGORIAS: { valor: string; rotulo: string }[] = [
  { valor: 'sem', rotulo: 'Sem categoria' },
  { valor: 'antes', rotulo: 'Antes' },
  { valor: 'durante', rotulo: 'Durante' },
  { valor: 'depois', rotulo: 'Depois' },
]

const VALIDADE_URL_SEGUNDOS = 3600

interface FotografiasProps {
  obraId: string
  obraTitulo: string
  obraLocalidade: string | null
  clienteId: string
}

export default function Fotografias({
  obraId,
  obraTitulo,
  obraLocalidade,
  clienteId,
}: FotografiasProps) {
  const { perfil } = useAuth()
  const [fotografias, setFotografias] = useState<ObraFotografiaRow[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [fila, setFila] = useState<ItemFila[]>([])
  const [categoria, setCategoria] = useState('sem')
  const [selecionada, setSelecionada] = useState<ObraFotografiaRow | null>(null)
  const [legenda, setLegenda] = useState('')
  const [publicar, setPublicar] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [autorizadoPor, setAutorizadoPor] = useState('')
  const [aPublicar, setAPublicar] = useState(false)
  const [confirmarApagar, setConfirmarApagar] = useState(false)
  const [aApagar, setAApagar] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('obras_fotografias')
      .select('*')
      .eq('obra_id', obraId)
      .order('ordem', { ascending: true })

    if (error) {
      toast.error(`Não foi possível carregar as fotografias. ${mensagemErro(error)}`)
      return
    }
    const linhas = data ?? []
    setFotografias(linhas)

    if (linhas.length > 0) {
      // URLs assinadas em lote. O bucket é privado, nunca se constrói URL pública.
      const { data: assinadas } = await supabase.storage
        .from('obras-fotografias')
        .createSignedUrls(
          linhas.map((linha) => linha.storage_path),
          VALIDADE_URL_SEGUNDOS,
        )
      const mapa: Record<string, string> = {}
      for (const [indice, item] of (assinadas ?? []).entries()) {
        const linha = linhas[indice]
        if (linha && item.signedUrl) mapa[linha.id] = item.signedUrl
      }
      setUrls(mapa)
    } else {
      setUrls({})
    }
  }, [obraId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => filaUpload.subscrever(setFila), [])

  useEffect(() => {
    const desteObra = fila.filter((item) => item.obraId === obraId)
    if (desteObra.length > 0 && desteObra.every((item) => item.estado !== 'a_enviar')) {
      void carregar()
    }
  }, [carregar, fila, obraId])

  function aceitarFicheiros(lista: FileList | null) {
    if (!lista) return
    const validos = Array.from(lista).filter((ficheiro) => {
      if (tipoAceite(ficheiro)) return true
      toast.error(`"${ficheiro.name}" não é um formato aceite.`)
      return false
    })
    if (validos.length > 0) filaUpload.adicionar(obraId, validos)
  }

  async function guardarDetalhe() {
    if (!selecionada) return
    const { error } = await supabase
      .from('obras_fotografias')
      .update({ legenda: legenda.trim() || null, categoria: selecionada.categoria })
      .eq('id', selecionada.id)
    if (error) {
      toast.error(`Não foi possível guardar. ${mensagemErro(error)}`)
      return
    }
    setSelecionada(null)
    void carregar()
  }

  async function apagar() {
    if (!selecionada) return
    setAApagar(true)
    const { error } = await supabase.from('obras_fotografias').delete().eq('id', selecionada.id)
    if (error) {
      setAApagar(false)
      toast.error(`Não foi possível apagar. ${mensagemErro(error)}`)
      return
    }
    await supabase.storage.from('obras-fotografias').remove([selecionada.storage_path])
    setAApagar(false)
    setConfirmarApagar(false)
    setSelecionada(null)
    void carregar()
  }

  async function publicarNoPortefolio() {
    if (confirmacao.trim().toUpperCase() !== 'PUBLICAR') {
      toast.error('Escreva PUBLICAR para confirmar.')
      return
    }
    if (!autorizadoPor.trim()) {
      toast.error('Indique quem autorizou a publicação.')
      return
    }

    setAPublicar(true)
    const escolhidas = fotografias.filter((foto) => foto.categoria !== null)
    if (escolhidas.length === 0) {
      setAPublicar(false)
      toast.error('Classifique as fotografias em antes, durante ou depois antes de publicar.')
      return
    }

    const { data: obraPublica, error: erroObra } = await supabase
      .from('obras_publicas')
      .insert({
        titulo: obraTitulo,
        localidade: obraLocalidade,
        tipo_intervencao: 'remodelacao',
        descricao: null,
        imagem_capa: null,
        visivel: false,
      })
      .select('id')
      .single()

    if (erroObra || !obraPublica) {
      setAPublicar(false)
      toast.error(`Não foi possível criar a obra pública. ${mensagemErro(erroObra)}`)
      return
    }

    let publicadas = 0
    const falhas: string[] = []

    for (const [indice, foto] of escolhidas.entries()) {
      const { data: ficheiro, error: erroDescarga } = await supabase.storage
        .from('obras-fotografias')
        .download(foto.storage_path)
      if (erroDescarga || !ficheiro) {
        falhas.push(foto.legenda ?? `fotografia ${indice + 1}`)
        continue
      }

      const destino = `${obraPublica.id}/${crypto.randomUUID()}.jpg`
      const { error: erroCopia } = await supabase.storage
        .from('obras-publicas')
        .upload(destino, ficheiro, { contentType: 'image/jpeg' })
      if (erroCopia) {
        falhas.push(foto.legenda ?? `fotografia ${indice + 1}`)
        continue
      }

      const { data: publica } = supabase.storage.from('obras-publicas').getPublicUrl(destino)
      const { error: erroInsercao } = await supabase.from('obras_publicas_imagens').insert({
        obra_id: obraPublica.id,
        url: publica.publicUrl,
        storage_path: destino,
        categoria: foto.categoria,
        legenda: foto.legenda,
        ordem: indice,
      })
      if (erroInsercao) {
        falhas.push(foto.legenda ?? `fotografia ${indice + 1}`)
        continue
      }

      publicadas += 1
    }

    if (publicadas > 0) {
      const { error: erroAutorizacao } = await supabase.from('autorizacoes_publicacao').insert({
        obra_id: obraId,
        cliente_id: clienteId,
        autorizado_por: autorizadoPor.trim(),
        meio: 'escrito',
        observacoes: `Registado por ${perfil?.nome ?? 'ALC'}.`,
        registado_por: perfil?.id ?? null,
      })
      if (erroAutorizacao) {
        setAPublicar(false)
        toast.error(`As fotografias foram copiadas, mas a autorização não ficou registada. ${mensagemErro(erroAutorizacao)}`)
        return
      }

      await supabase.from('obras').update({ obra_publica_id: obraPublica.id }).eq('id', obraId)
    }

    setAPublicar(false)
    setPublicar(false)
    setConfirmacao('')
    setAutorizadoPor('')

    if (falhas.length === 0) {
      toast.success('Fotografias copiadas. A obra fica invisível no site até ser marcada como visível.')
    } else if (publicadas === 0) {
      toast.error(`Não foi possível publicar nenhuma fotografia (${falhas.length} falharam). Tente novamente.`)
    } else {
      toast.error(`${publicadas} fotografia(s) publicada(s), mas ${falhas.length} falharam: ${falhas.join(', ')}.`)
    }
  }

  const filtradas = fotografias.filter((foto) =>
    categoria === 'sem' ? foto.categoria === null : foto.categoria === categoria,
  )
  const filaDestaObra = fila.filter((item) => item.obraId === obraId && item.estado !== 'concluido')

  return (
    <div className="space-y-6">
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
          Escolher do telemóvel
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

      {filaDestaObra.length > 0 ? (
        <ul className="space-y-2 border border-alc-line bg-white p-3">
          {filaDestaObra.map((item) => (
            <li key={item.id} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{item.nome}</span>
                {item.estado === 'falhado' ? (
                  <button
                    type="button"
                    onClick={() => filaUpload.repetir(item.id)}
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

      <div className="flex flex-wrap gap-2">
        {CATEGORIAS.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={categoria === opcao.valor}
            onClick={() => setCategoria(opcao.valor)}
            className={cn(
              'rounded-[2px] border px-3 py-2 text-sm',
              categoria === opcao.valor
                ? 'border-alc-rose-dark bg-alc-rose-dark text-white'
                : 'border-alc-line',
            )}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <EstadoVazio titulo="Ainda não há fotografias nesta categoria." />
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtradas.map((foto) => (
            <li key={foto.id}>
              <button
                type="button"
                onClick={() => {
                  setSelecionada(foto)
                  setLegenda(foto.legenda ?? '')
                }}
                className="block w-full"
              >
                {urls[foto.id] ? (
                  <img
                    src={urls[foto.id]}
                    alt={foto.legenda ?? 'Fotografia da obra'}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="block aspect-square w-full bg-alc-grey" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-alc-line pt-4">
        <Button variante="secundario" onClick={() => setPublicar(true)}>
          <Upload aria-hidden className="size-4" />
          Publicar no site
        </Button>
        <p className="mt-2 text-sm text-alc-ink">
          Só depois de ter autorização do cliente. As fotografias passam a ser públicas.
        </p>
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
              <Button onClick={() => void guardarDetalhe()}>Guardar</Button>
            </>
          ) : null
        }
      >
        {selecionada ? (
          <div className="space-y-4">
            {urls[selecionada.id] ? (
              <img
                src={urls[selecionada.id]}
                alt={selecionada.legenda ?? 'Fotografia da obra'}
                className="max-h-[50dvh] w-full object-contain"
              />
            ) : null}
            <div>
              <p className="mb-2 text-sm text-alc-ink">Categoria</p>
              <Select
                valor={selecionada.categoria ?? 'sem'}
                aoMudar={(valor) =>
                  setSelecionada({
                    ...selecionada,
                    categoria: valor === 'sem' ? null : (valor as CategoriaFoto),
                  })
                }
                opcoes={CATEGORIAS}
              />
            </div>
            <div>
              <p className="mb-2 text-sm text-alc-ink">Legenda</p>
              <Textarea
                rows={2}
                value={legenda}
                onChange={(evento) => setLegenda(evento.target.value)}
              />
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        aberto={publicar}
        aoMudar={setPublicar}
        titulo="Publicar fotografias no site"
        descricao="As fotografias classificadas passam a estar acessíveis publicamente."
        rodape={
          <>
            <Button variante="secundario" onClick={() => setPublicar(false)}>
              Cancelar
            </Button>
            <Button ocupado={aPublicar} onClick={() => void publicarNoPortefolio()}>
              Publicar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="border-l-2 border-alc-rose-dark bg-alc-rose-light p-3 text-sm">
            É necessária autorização do cliente para publicar fotografias do interior da casa dele.
            Este passo fica registado.
          </p>
          <div>
            <p className="mb-2 text-sm text-alc-ink">Quem autorizou</p>
            <Input
              value={autorizadoPor}
              onChange={(evento) => setAutorizadoPor(evento.target.value)}
              placeholder="Nome de quem deu a autorização"
            />
          </div>
          <div>
            <p className="mb-2 text-sm text-alc-ink">Escreva PUBLICAR para confirmar</p>
            <Input value={confirmacao} onChange={(evento) => setConfirmacao(evento.target.value)} />
          </div>
          <Badge tom="neutro">
            {fotografias.filter((foto) => foto.categoria !== null).length} fotografias classificadas
          </Badge>
        </div>
      </Dialog>

      <ConfirmarDialog
        aberto={confirmarApagar}
        aoMudar={setConfirmarApagar}
        titulo="Apagar fotografia"
        descricao="Esta fotografia vai ser apagada. A ação não pode ser revertida."
        ocupado={aApagar}
        aoConfirmar={() => void apagar()}
      />
    </div>
  )
}
