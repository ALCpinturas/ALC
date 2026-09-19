import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Pencil, Plus } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import Cabecalho from '@/components/admin/Cabecalho'
import FormularioCliente from '@/components/admin/FormularioCliente'
import FormularioObra from '@/components/admin/FormularioObra'
import { useCliente } from '@/lib/hooks/useClientes'
import { useObras, FILTROS_OBRAS_INICIAIS } from '@/lib/hooks/useObras'
import { formatarData, formatarEuros, formatarTelefone } from '@/lib/format'
import { ROTULO_ESTADO_OBRA } from '@/lib/schemas/comum'
import { useSeo } from '@/lib/useSeo'

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>()
  const { cliente, aCarregar, erro, recarregar } = useCliente(id)
  const { obras, recarregar: recarregarObras } = useObras({
    ...FILTROS_OBRAS_INICIAIS,
    cliente_id: id ?? 'todos',
  })
  const [editar, setEditar] = useState(false)
  const [novaObra, setNovaObra] = useState(false)

  useSeo({
    titulo: cliente ? `${cliente.nome} — ALC` : 'Cliente — ALC',
    descricao: 'Ficha de cliente.',
    naoIndexar: true,
  })

  if (aCarregar) {
    return (
      <div className="space-y-3 p-4 md:p-6">
        <Esqueleto className="h-8 w-48" />
        <Esqueleto className="h-32 w-full" />
      </div>
    )
  }

  if (erro) return <EstadoErro className="m-4" mensagem={erro} aoRepetir={() => void recarregar()} />
  if (!cliente) {
    return (
      <EstadoVazio
        className="m-4"
        titulo="Cliente não encontrado."
        descricao="O registo pode ter sido removido."
      />
    )
  }

  return (
    <>
      <Cabecalho
        titulo={cliente.nome}
        subtitulo={`Cliente desde ${formatarData(cliente.criado_em)}`}
        voltarPara="/admin/clientes"
        acoes={
          <>
            <Button variante="secundario" tamanho="sm" onClick={() => setEditar(true)}>
              <Pencil aria-hidden className="size-4" />
              Editar
            </Button>
            <Button tamanho="sm" onClick={() => setNovaObra(true)}>
              <Plus aria-hidden className="size-4" />
              Nova obra
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-4 md:p-6">
        <section className="border border-alc-line bg-white p-4">
          <h2 className="font-display text-lg text-alc-black">Dados</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-alc-ink">Telefone</dt>
              <dd>
                {cliente.telefone ? (
                  <a href={`tel:${cliente.telefone}`} className="text-alc-rose-deep underline underline-offset-4">
                    {formatarTelefone(cliente.telefone)}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-alc-ink">Email</dt>
              <dd className="truncate">{cliente.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-alc-ink">NIF</dt>
              <dd>{cliente.nif ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-alc-ink">Morada</dt>
              <dd>
                {cliente.morada ?? '—'}
                {cliente.codigo_postal ? `, ${cliente.codigo_postal}` : ''}
                {cliente.localidade ? ` ${cliente.localidade}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-alc-ink">Origem</dt>
              <dd className="capitalize">{cliente.origem}</dd>
            </div>
          </dl>
          {cliente.notas ? (
            <p className="mt-4 whitespace-pre-line border-t border-alc-line pt-4 text-sm text-alc-ink">
              {cliente.notas}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg text-alc-black">Obras</h2>
          {obras.length === 0 ? (
            <EstadoVazio
              titulo="Este cliente ainda não tem obras."
              acao={<Button onClick={() => setNovaObra(true)}>Criar obra</Button>}
            />
          ) : (
            <ul className="space-y-3">
              {obras.map((obra) => (
                <li key={obra.id}>
                  <Link
                    to={`/admin/obras/${obra.id}`}
                    className="flex items-center justify-between gap-4 border border-alc-line bg-white p-4 hover:border-alc-rose-dark"
                  >
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-alc-ink">{obra.numero}</p>
                      <p className="truncate font-medium text-alc-black">{obra.titulo}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tom="neutro">{ROTULO_ESTADO_OBRA[obra.estado]}</Badge>
                      {obra.valor_adjudicado_cents ? (
                        <p className="mt-1 text-sm">{formatarEuros(obra.valor_adjudicado_cents)}</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <FormularioCliente
        aberto={editar}
        cliente={cliente}
        aoFechar={() => setEditar(false)}
        aoGuardar={() => void recarregar()}
      />
      <FormularioObra
        aberto={novaObra}
        obra={null}
        clienteFixo={{ id: cliente.id, nome: cliente.nome }}
        aoFechar={() => setNovaObra(false)}
        aoGuardar={() => void recarregarObras()}
      />
    </>
  )
}
