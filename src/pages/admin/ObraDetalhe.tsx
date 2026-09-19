import * as TabsPrimitive from '@radix-ui/react-tabs'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Pencil } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import Cabecalho from '@/components/admin/Cabecalho'
import Diario from '@/components/admin/Diario'
import FormularioObra from '@/components/admin/FormularioObra'
import Fotografias from '@/components/admin/Fotografias'
import OrcamentosDaObra from '@/components/admin/OrcamentosDaObra'
import { useObra } from '@/lib/hooks/useObras'
import { formatarData, formatarEuros } from '@/lib/format'
import { ROTULO_ESTADO_OBRA, ROTULO_INTERVENCAO } from '@/lib/schemas/comum'
import { useSeo } from '@/lib/useSeo'
import { cn } from '@/lib/cn'

const SEPARADORES = [
  { valor: 'resumo', rotulo: 'Resumo' },
  { valor: 'fotografias', rotulo: 'Fotografias' },
  { valor: 'diario', rotulo: 'Diário' },
  { valor: 'orcamentos', rotulo: 'Orçamentos' },
]

export default function ObraDetalhe() {
  const { id } = useParams<{ id: string }>()
  const { obra, aCarregar, erro, recarregar } = useObra(id)
  const [editar, setEditar] = useState(false)

  useSeo({
    titulo: obra ? `${obra.numero} — ALC` : 'Obra — ALC',
    descricao: 'Ficha de obra.',
    naoIndexar: true,
  })

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

  return (
    <>
      <Cabecalho
        titulo={obra.titulo}
        subtitulo={`${obra.numero} · ${obra.cliente?.nome ?? 'Sem cliente'}`}
        voltarPara="/admin/obras"
        acoes={
          <Button variante="secundario" tamanho="sm" onClick={() => setEditar(true)}>
            <Pencil aria-hidden className="size-4" />
            Editar
          </Button>
        }
      />

      <TabsPrimitive.Root defaultValue="resumo">
        <TabsPrimitive.List
          aria-label="Separadores da obra"
          className="flex overflow-x-auto border-b border-alc-line bg-white px-2"
        >
          {SEPARADORES.map((separador) => (
            <TabsPrimitive.Trigger
              key={separador.valor}
              value={separador.valor}
              className={cn(
                'toque shrink-0 border-b-2 border-transparent px-4 text-sm text-alc-ink',
                'data-[state=active]:border-alc-rose-dark data-[state=active]:text-alc-black',
              )}
            >
              {separador.rotulo}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>

        <div className="p-4 md:p-6">
          <TabsPrimitive.Content value="resumo">
            <div className="space-y-4 border border-alc-line bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tom="escuro">{ROTULO_ESTADO_OBRA[obra.estado]}</Badge>
                {obra.tipos_intervencao.map((tipo) => (
                  <Badge key={tipo} tom="rosa">
                    {ROTULO_INTERVENCAO[tipo]}
                  </Badge>
                ))}
              </div>

              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-alc-ink">Cliente</dt>
                  <dd>
                    {obra.cliente ? (
                      <Link
                        to={`/admin/clientes/${obra.cliente.id}`}
                        className="text-alc-rose-deep underline underline-offset-4"
                      >
                        {obra.cliente.nome}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-alc-ink">Morada</dt>
                  <dd>
                    {obra.morada ?? '—'}
                    {obra.localidade ? `, ${obra.localidade}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-alc-ink">Início</dt>
                  <dd>{formatarData(obra.data_inicio)}</dd>
                </div>
                <div>
                  <dt className="text-alc-ink">Fim previsto</dt>
                  <dd>{formatarData(obra.data_fim_prevista)}</dd>
                </div>
                <div>
                  <dt className="text-alc-ink">Fim real</dt>
                  <dd>{formatarData(obra.data_fim_real)}</dd>
                </div>
                <div>
                  <dt className="text-alc-ink">Valor adjudicado</dt>
                  <dd>
                    {obra.valor_adjudicado_cents ? formatarEuros(obra.valor_adjudicado_cents) : '—'}
                  </dd>
                </div>
              </dl>

              {obra.notas ? (
                <p className="whitespace-pre-line border-t border-alc-line pt-4 text-sm text-alc-ink">
                  {obra.notas}
                </p>
              ) : null}
            </div>
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="fotografias">
            <Fotografias
              obraId={obra.id}
              obraTitulo={obra.titulo}
              obraLocalidade={obra.localidade}
              clienteId={obra.cliente_id}
            />
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="diario">
            <Diario obraId={obra.id} />
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="orcamentos">
            <OrcamentosDaObra obraId={obra.id} clienteId={obra.cliente_id} />
          </TabsPrimitive.Content>
        </div>
      </TabsPrimitive.Root>

      <FormularioObra
        aberto={editar}
        obra={obra}
        aoFechar={() => setEditar(false)}
        aoGuardar={() => void recarregar()}
      />
    </>
  )
}
