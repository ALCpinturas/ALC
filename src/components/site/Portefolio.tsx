import { useMemo, useState } from 'react'
import Badge from '@/components/ui/Badge'
import Dialog from '@/components/ui/Dialog'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import { useObrasPublicas, type ObraPublica } from '@/lib/hooks/useObrasPublicas'
import { ROTULO_INTERVENCAO } from '@/lib/schemas/comum'
import { cn } from '@/lib/cn'
import Seccao from './Seccao'

const FILTROS = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'pintura', rotulo: 'Pintura' },
  { valor: 'pladur', rotulo: 'Pladur' },
  { valor: 'pavimentos', rotulo: 'Pavimentos' },
  { valor: 'acabamentos', rotulo: 'Acabamentos' },
  { valor: 'remodelacao', rotulo: 'Remodelações' },
] as const

export default function Portefolio() {
  const { obras, aCarregar, erro, recarregar } = useObrasPublicas()
  const [filtro, setFiltro] = useState<string>('todos')
  const [aberta, setAberta] = useState<ObraPublica | null>(null)

  const visiveis = useMemo(
    () => (filtro === 'todos' ? obras : obras.filter((obra) => obra.tipo_intervencao === filtro)),
    [filtro, obras],
  )

  return (
    <Seccao
      id="portefolio"
      fundo="branco"
      titulo="Trabalhos que falam por nós"
      subtitulo="Cada obra tem uma história, necessidades diferentes e soluções próprias."
    >
      <div className="-mx-4 mb-8 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div role="tablist" aria-label="Filtrar por tipo de trabalho" className="flex gap-2">
          {FILTROS.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              role="tab"
              aria-selected={filtro === opcao.valor}
              onClick={() => setFiltro(opcao.valor)}
              className={cn(
                'shrink-0 rounded-[2px] border px-4 py-2 text-sm transition-colors',
                filtro === opcao.valor
                  ? 'border-alc-rose-dark bg-alc-rose-dark text-white'
                  : 'border-alc-line text-alc-ink hover:border-alc-rose-dark',
              )}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro ? <EstadoErro mensagem={erro} aoRepetir={() => void recarregar()} /> : null}

      {aCarregar ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((indice) => (
            <div key={indice} className="space-y-3">
              <Esqueleto className="aspect-[4/3] w-full" />
              <Esqueleto className="h-5 w-2/3" />
              <Esqueleto className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : null}

      {!aCarregar && !erro && visiveis.length === 0 ? (
        <EstadoVazio
          titulo="Ainda não há trabalhos publicados nesta categoria."
          descricao="Assim que houver obras concluídas, aparecem aqui."
        />
      ) : null}

      {!aCarregar && visiveis.length > 0 ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((obra) => (
            <li key={obra.id}>
              <button
                type="button"
                onClick={() => setAberta(obra)}
                className="group w-full text-left"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-alc-grey">
                  {obra.imagem_capa ? (
                    <img
                      src={obra.imagem_capa}
                      alt={obra.titulo}
                      width={800}
                      height={600}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg text-alc-black">{obra.titulo}</h3>
                    {obra.localidade ? (
                      <p className="text-sm text-alc-ink">{obra.localidade}</p>
                    ) : null}
                  </div>
                  <Badge tom="rosa">{ROTULO_INTERVENCAO[obra.tipo_intervencao]}</Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog
        aberto={aberta !== null}
        aoMudar={(estado) => {
          if (!estado) setAberta(null)
        }}
        titulo={aberta?.titulo ?? ''}
        descricao={aberta?.localidade ?? undefined}
        largura="lg"
      >
        {aberta ? (
          <div className="space-y-6">
            {aberta.descricao ? <p className="text-alc-ink">{aberta.descricao}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {aberta.imagens.map((imagem) => (
                <figure key={imagem.id}>
                  <img
                    src={imagem.url}
                    alt={imagem.legenda ?? aberta.titulo}
                    loading="lazy"
                    decoding="async"
                    className="w-full object-cover"
                  />
                  {imagem.legenda ? (
                    <figcaption className="mt-1 text-sm text-alc-ink">{imagem.legenda}</figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        ) : null}
      </Dialog>
    </Seccao>
  )
}
