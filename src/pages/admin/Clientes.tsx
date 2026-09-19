import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Search } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { EstadoErro, EstadoVazio, Esqueleto } from '@/components/ui/Estados'
import Cabecalho from '@/components/admin/Cabecalho'
import FormularioCliente from '@/components/admin/FormularioCliente'
import { CLIENTES_POR_PAGINA, useClientes } from '@/lib/hooks/useClientes'
import { formatarData, formatarTelefone } from '@/lib/format'
import { useSeo } from '@/lib/useSeo'

export default function Clientes() {
  useSeo({ titulo: 'Clientes — ALC', descricao: 'Gestão de clientes.', naoIndexar: true })

  const [texto, setTexto] = useState('')
  const [pesquisa, setPesquisa] = useState('')
  const [pagina, setPagina] = useState(0)
  const [novoAberto, setNovoAberto] = useState(false)

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setPesquisa(texto)
      setPagina(0)
    }, 300)
    return () => clearTimeout(temporizador)
  }, [texto])

  const { clientes, total, aCarregar, erro, recarregar } = useClientes(pesquisa, pagina)
  const paginas = Math.max(1, Math.ceil(total / CLIENTES_POR_PAGINA))

  return (
    <>
      <Cabecalho
        titulo="Clientes"
        subtitulo={`${total} ${total === 1 ? 'cliente' : 'clientes'}`}
        acoes={
          <Button tamanho="sm" onClick={() => setNovoAberto(true)}>
            <Plus aria-hidden className="size-4" />
            Novo cliente
          </Button>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="relative max-w-md">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-alc-ink" />
          <Input
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Nome, telefone, email ou NIF"
            aria-label="Pesquisar clientes"
            className="pl-9"
          />
        </div>

        {erro ? <EstadoErro mensagem={erro} aoRepetir={() => void recarregar()} /> : null}

        {aCarregar ? (
          <div className="space-y-2">
            {[0, 1, 2].map((indice) => (
              <Esqueleto key={indice} className="h-20 w-full" />
            ))}
          </div>
        ) : null}

        {!aCarregar && clientes.length === 0 && !erro ? (
          <EstadoVazio
            titulo="Ainda não há clientes."
            descricao="Crie um cliente ou converta uma lead recebida pelo site."
            acao={<Button onClick={() => setNovoAberto(true)}>Novo cliente</Button>}
          />
        ) : null}

        {!aCarregar && clientes.length > 0 ? (
          <ul className="space-y-3">
            {clientes.map((cliente) => (
              <li key={cliente.id}>
                <Link
                  to={`/admin/clientes/${cliente.id}`}
                  className="flex items-center justify-between gap-4 border border-alc-line bg-white p-4 hover:border-alc-rose-dark"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-alc-black">{cliente.nome}</p>
                    <p className="mt-1 text-sm text-alc-ink">
                      {formatarTelefone(cliente.telefone)}
                      {cliente.localidade ? ` · ${cliente.localidade}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm text-alc-ink">
                    <p>
                      {cliente.obras[0]?.count ?? 0}{' '}
                      {(cliente.obras[0]?.count ?? 0) === 1 ? 'obra' : 'obras'}
                    </p>
                    <p className="mt-1">{formatarData(cliente.criado_em)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {paginas > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <Button
              variante="secundario"
              tamanho="sm"
              disabled={pagina === 0}
              onClick={() => setPagina((atual) => atual - 1)}
            >
              Anterior
            </Button>
            <p className="text-sm text-alc-ink">
              Página {pagina + 1} de {paginas}
            </p>
            <Button
              variante="secundario"
              tamanho="sm"
              disabled={pagina + 1 >= paginas}
              onClick={() => setPagina((atual) => atual + 1)}
            >
              Seguinte
            </Button>
          </div>
        ) : null}
      </div>

      <FormularioCliente
        aberto={novoAberto}
        cliente={null}
        aoFechar={() => setNovoAberto(false)}
        aoGuardar={() => void recarregar()}
      />
    </>
  )
}
