import { useState } from 'react'
import { KeyRound, ShieldPlus } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Input from '@/components/ui/Input'
import InputPassword from '@/components/ui/InputPassword'
import RadioCards from '@/components/ui/RadioCards'
import { EstadoErro, Esqueleto } from '@/components/ui/Estados'
import { useAuth } from '@/lib/auth'
import { formatarData } from '@/lib/format'
import { useUtilizadores } from '@/lib/hooks/useUtilizadores'
import {
  DESCRICAO_PAPEL,
  esquemaAlterarPalavraPasse,
  esquemaNovoUtilizador,
  PAPEIS,
  ROTULO_PAPEL,
  type DadosNovoUtilizador,
} from '@/lib/schemas/conta'
import { mensagemErro, mensagemErroFuncao, supabase } from '@/lib/supabase'
import { useFormulario } from '@/lib/useFormulario'
import { useSeo } from '@/lib/useSeo'

export default function Conta() {
  useSeo({ titulo: 'Conta — ALC', descricao: 'Acesso ao backoffice.', naoIndexar: true })

  const { perfil, sessao } = useAuth()
  const ehAdmin = perfil?.papel === 'admin'

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PalavraPasse email={sessao?.user.email ?? null} />
      {/* Só um administrador cria contas: quem não é admin nem vê o formulário nem a lista. */}
      {ehAdmin ? <NovoUtilizador /> : null}
      {ehAdmin ? <ListaUtilizadores /> : null}
    </div>
  )
}

const VALORES_PALAVRA_PASSE = { atual: '', nova: '', confirmacao: '' }

function PalavraPasse({ email }: { email: string | null }) {
  const formulario = useFormulario(esquemaAlterarPalavraPasse, VALORES_PALAVRA_PASSE)

  async function guardar() {
    await formulario.submeter(async (dados) => {
      if (!email) {
        toast.error('Sessão sem email associado. Saia e entre novamente.')
        return
      }

      // Não há endpoint próprio para confirmar a palavra-passe atual: reautenticar com ela
      // é a forma de verificar sem guardar mais nada. A sessão que resulta é a mesma conta.
      const { error: erroVerificacao } = await supabase.auth.signInWithPassword({
        email,
        password: dados.atual,
      })
      if (erroVerificacao) {
        toast.error('A palavra-passe atual não está correta.')
        return
      }

      const { error } = await supabase.auth.updateUser({ password: dados.nova })
      if (error) {
        toast.error(`Não foi possível alterar a palavra-passe. ${mensagemErro(error)}`)
        return
      }
      toast.success('Palavra-passe alterada.')
      formulario.reiniciar(VALORES_PALAVRA_PASSE)
    })
  }

  return (
    <section className="border border-alc-line bg-white p-4 md:p-6">
      <div className="flex items-center gap-2">
        <KeyRound aria-hidden className="size-5 text-alc-rose-deep" strokeWidth={1.5} />
        <h2 className="font-display text-lg text-alc-black">Palavra-passe</h2>
      </div>
      <p className="mt-1 text-sm text-alc-ink">Vale para esta conta, em qualquer aparelho.</p>

      <div className="mt-4 max-w-sm space-y-4">
        <Campo etiqueta="Palavra-passe atual" erro={formulario.erros.atual} obrigatorio>
          <InputPassword
            autoComplete="current-password"
            value={formulario.valores.atual}
            onChange={(evento) => formulario.definir('atual', evento.target.value)}
            onBlur={() => formulario.aoSairDoCampo('atual')}
          />
        </Campo>
        <Campo
          etiqueta="Nova palavra-passe"
          erro={formulario.erros.nova}
          ajuda="Pelo menos 10 caracteres, com letras e algarismos."
          obrigatorio
        >
          <InputPassword
            autoComplete="new-password"
            value={formulario.valores.nova}
            onChange={(evento) => formulario.definir('nova', evento.target.value)}
            onBlur={() => formulario.aoSairDoCampo('nova')}
          />
        </Campo>
        <Campo etiqueta="Confirmar nova palavra-passe" erro={formulario.erros.confirmacao} obrigatorio>
          <InputPassword
            autoComplete="new-password"
            value={formulario.valores.confirmacao}
            onChange={(evento) => formulario.definir('confirmacao', evento.target.value)}
            onBlur={() => formulario.aoSairDoCampo('confirmacao')}
          />
        </Campo>
        <Button className="toque" ocupado={formulario.aSubmeter} onClick={() => void guardar()}>
          Alterar palavra-passe
        </Button>
      </div>
    </section>
  )
}

const VALORES_NOVO_UTILIZADOR: DadosNovoUtilizador = {
  nome: '',
  email: '',
  palavraPasse: '',
  papel: 'admin',
}

function NovoUtilizador() {
  const formulario = useFormulario(esquemaNovoUtilizador, VALORES_NOVO_UTILIZADOR)
  const [ultimoCriado, setUltimoCriado] = useState<string | null>(null)

  async function criar() {
    await formulario.submeter(async (dados) => {
      const { error } = await supabase.functions.invoke('criar-utilizador', { body: dados })
      if (error) {
        toast.error(`Não foi possível criar a conta. ${await mensagemErroFuncao(error)}`)
        return
      }
      toast.success(`Conta criada para ${dados.nome}.`)
      setUltimoCriado(dados.email)
      formulario.reiniciar(VALORES_NOVO_UTILIZADOR)
    })
  }

  return (
    <section className="border border-alc-line bg-white p-4 md:p-6">
      <div className="flex items-center gap-2">
        <ShieldPlus aria-hidden className="size-5 text-alc-rose-deep" strokeWidth={1.5} />
        <h2 className="font-display text-lg text-alc-black">Nova conta de acesso</h2>
      </div>
      <p className="mt-1 text-sm text-alc-ink">
        A conta fica ativa de imediato, com a palavra-passe que definir aqui. Combine-a com a
        pessoa por um canal seguro, nunca por email.
      </p>

      <div className="mt-4 max-w-md space-y-4">
        <Campo etiqueta="Nome" erro={formulario.erros.nome} obrigatorio>
          <Input
            value={formulario.valores.nome}
            onChange={(evento) => formulario.definir('nome', evento.target.value)}
            onBlur={() => formulario.aoSairDoCampo('nome')}
          />
        </Campo>
        <Campo etiqueta="Email" erro={formulario.erros.email} obrigatorio>
          <Input
            type="email"
            inputMode="email"
            autoComplete="off"
            value={formulario.valores.email}
            onChange={(evento) => formulario.definir('email', evento.target.value)}
            onBlur={() => formulario.aoSairDoCampo('email')}
          />
        </Campo>
        <Campo
          etiqueta="Palavra-passe"
          erro={formulario.erros.palavraPasse}
          ajuda="Pelo menos 10 caracteres, com letras e algarismos."
          obrigatorio
        >
          <InputPassword
            autoComplete="new-password"
            value={formulario.valores.palavraPasse}
            onChange={(evento) => formulario.definir('palavraPasse', evento.target.value)}
            onBlur={() => formulario.aoSairDoCampo('palavraPasse')}
          />
        </Campo>
        <Campo etiqueta="Papel">
          <RadioCards
            rotuloGrupo="Papel da nova conta"
            valor={formulario.valores.papel}
            aoMudar={(valor) => formulario.definir('papel', valor as DadosNovoUtilizador['papel'])}
            colunas={2}
            opcoes={PAPEIS.map((papel) => ({
              valor: papel,
              rotulo: ROTULO_PAPEL[papel],
              descricao: DESCRICAO_PAPEL[papel],
            }))}
          />
        </Campo>
        <Button className="toque" ocupado={formulario.aSubmeter} onClick={() => void criar()}>
          Criar conta
        </Button>
        {ultimoCriado ? (
          <p className="text-sm text-alc-ink">
            Conta criada para <span className="font-medium text-alc-black">{ultimoCriado}</span>.
          </p>
        ) : null}
      </div>
    </section>
  )
}

function ListaUtilizadores() {
  const { utilizadores, aCarregar, erro, recarregar } = useUtilizadores()

  return (
    <section className="border border-alc-line bg-white p-4 md:p-6">
      <h2 className="font-display text-lg text-alc-black">Contas com acesso</h2>

      {erro ? (
        <EstadoErro mensagem={erro} aoRepetir={() => void recarregar()} className="mt-3" />
      ) : null}

      {aCarregar ? (
        <div className="mt-3 space-y-2">
          {[0, 1].map((indice) => (
            <Esqueleto key={indice} className="h-14 w-full" />
          ))}
        </div>
      ) : null}

      {!aCarregar && utilizadores.length > 0 ? (
        <ul className="mt-3 divide-y divide-alc-line">
          {utilizadores.map((utilizador) => (
            <li key={utilizador.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-alc-black">{utilizador.nome}</p>
                <p className="text-sm text-alc-ink">Desde {formatarData(utilizador.criado_em)}</p>
              </div>
              <Badge tom={utilizador.papel === 'admin' ? 'escuro' : 'neutro'}>
                {ROTULO_PAPEL[utilizador.papel]}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
