import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ImagePlus, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { EstadoErro } from '@/components/ui/Estados'
import { comprimirImagem, tipoAceite } from '@/lib/imagens'
import { mensagemErro, supabase } from '@/lib/supabase'
import { esquemaContacto } from '@/lib/schemas/contacto'
import { ROTULO_INTERVENCAO, TEXTO_CONSENTIMENTO, TIPOS_INTERVENCAO } from '@/lib/schemas/comum'
import { useFormulario } from '@/lib/useFormulario'
import Seccao from './Seccao'

const MAXIMO_FOTOGRAFIAS = 6
const TAMANHO_MAXIMO = 10 * 1024 * 1024
const SEGUNDOS_MINIMOS = 3

interface Anexo {
  id: string
  nome: string
  miniatura: string
  ficheiro: File
}

type Valores = {
  nome: string
  telefone: string
  email: string
  localidade: string
  tipo_intervencao: string
  area_m2: number | null
  mensagem: string
  consentimento: boolean
}

const INICIAL: Valores = {
  nome: '',
  telefone: '',
  email: '',
  localidade: '',
  tipo_intervencao: '',
  area_m2: null,
  mensagem: '',
  consentimento: false,
}

export default function Contactos() {
  const formulario = useFormulario(esquemaContacto, INICIAL)
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [aProcessar, setAProcessar] = useState(false)
  const armadilha = useRef('')
  const abertoEm = useRef(Date.now())

  useEffect(() => () => anexos.forEach((anexo) => URL.revokeObjectURL(anexo.miniatura)), [anexos])

  async function aoEscolherFicheiros(lista: FileList | null) {
    if (!lista) return
    setErroEnvio(null)
    setAProcessar(true)
    const novos: Anexo[] = []

    for (const ficheiro of Array.from(lista)) {
      if (anexos.length + novos.length >= MAXIMO_FOTOGRAFIAS) {
        toast.error(`Pode anexar no máximo ${MAXIMO_FOTOGRAFIAS} fotografias.`)
        break
      }
      if (!tipoAceite(ficheiro)) {
        toast.error(`"${ficheiro.name}" não é um formato aceite. Use JPEG, PNG ou WebP.`)
        continue
      }
      if (ficheiro.size > TAMANHO_MAXIMO) {
        toast.error(`"${ficheiro.name}" excede 10 MB.`)
        continue
      }
      try {
        const comprimida = await comprimirImagem(ficheiro, { larguraMaxima: 1920, qualidade: 0.82 })
        novos.push({
          id: crypto.randomUUID(),
          nome: ficheiro.name,
          miniatura: URL.createObjectURL(comprimida.ficheiro),
          ficheiro: comprimida.ficheiro,
        })
      } catch (erro) {
        toast.error(mensagemErro(erro))
      }
    }

    setAnexos((anteriores) => [...anteriores, ...novos])
    setAProcessar(false)
  }

  function removerAnexo(id: string) {
    setAnexos((anteriores) => {
      const alvo = anteriores.find((anexo) => anexo.id === id)
      if (alvo) URL.revokeObjectURL(alvo.miniatura)
      return anteriores.filter((anexo) => anexo.id !== id)
    })
  }

  async function submeter() {
    setErroEnvio(null)

    if (armadilha.current !== '') return
    if (Date.now() - abertoEm.current < SEGUNDOS_MINIMOS * 1000) {
      setErroEnvio('O pedido foi submetido demasiado depressa. Confirme os dados e tente de novo.')
      return
    }

    await formulario.submeter(async (dados) => {
      const caminhos: string[] = []
      for (const anexo of anexos) {
        const caminho = `${crypto.randomUUID()}-${anexo.ficheiro.name}`
        const { error } = await supabase.storage
          .from('pedidos-fotografias')
          .upload(caminho, anexo.ficheiro, { contentType: 'image/jpeg' })
        if (error) {
          setErroEnvio(`Não foi possível carregar "${anexo.nome}". ${mensagemErro(error)}`)
          return
        }
        caminhos.push(caminho)
      }

      const { error } = await supabase.from('pedidos_contacto').insert({
        nome: dados.nome,
        telefone: dados.telefone,
        email: dados.email,
        localidade: dados.localidade,
        tipo_intervencao: dados.tipo_intervencao,
        area_m2: dados.area_m2 ?? null,
        mensagem: dados.mensagem,
        fotografias: caminhos,
        consentimento: true,
        consentimento_texto: TEXTO_CONSENTIMENTO,
      })

      if (error) {
        setErroEnvio(mensagemErro(error))
        return
      }

      setAnexos([])
      formulario.reiniciar(INICIAL)
      setEnviado(true)
      toast.success('Pedido enviado. Entramos em contacto brevemente.')
    })
  }

  return (
    <Seccao
      id="contactos"
      fundo="cinza"
      titulo="Vamos falar sobre a sua obra"
      subtitulo="Explique-nos o que pretende transformar. Nós ajudamos a perceber qual a melhor forma de o fazer."
    >
      <div className="mx-auto max-w-2xl">
        {enviado ? (
          <div className="mb-8 border border-alc-rose-dark bg-white p-6">
            <h3 className="font-display text-xl text-alc-black">Recebemos o seu pedido.</h3>
            <p className="mt-2 text-alc-ink">
              Entramos em contacto pelos dados que deixou. Se for urgente, ligue-nos.
            </p>
            <Button variante="secundario" className="mt-4" onClick={() => setEnviado(false)}>
              Enviar outro pedido
            </Button>
          </div>
        ) : null}

        <form
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault()
            void submeter()
          }}
          className="space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo etiqueta="Nome" erro={formulario.erros.nome} obrigatorio>
              <Input
                value={formulario.valores.nome}
                autoComplete="name"
                onChange={(evento) => formulario.definir('nome', evento.target.value)}
                onBlur={() => formulario.aoSairDoCampo('nome')}
              />
            </Campo>
            <Campo etiqueta="Telefone" erro={formulario.erros.telefone} obrigatorio>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={formulario.valores.telefone}
                onChange={(evento) => formulario.definir('telefone', evento.target.value)}
                onBlur={() => formulario.aoSairDoCampo('telefone')}
              />
            </Campo>
            <Campo etiqueta="Email" erro={formulario.erros.email} obrigatorio>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={formulario.valores.email}
                onChange={(evento) => formulario.definir('email', evento.target.value)}
                onBlur={() => formulario.aoSairDoCampo('email')}
              />
            </Campo>
            <Campo etiqueta="Localidade" erro={formulario.erros.localidade} obrigatorio>
              <Input
                value={formulario.valores.localidade}
                autoComplete="address-level2"
                onChange={(evento) => formulario.definir('localidade', evento.target.value)}
                onBlur={() => formulario.aoSairDoCampo('localidade')}
              />
            </Campo>
            <Campo etiqueta="Tipo de trabalho" erro={formulario.erros.tipo_intervencao} obrigatorio>
              <Select
                valor={formulario.valores.tipo_intervencao}
                aoMudar={(valor) => formulario.definir('tipo_intervencao', valor)}
                opcoes={TIPOS_INTERVENCAO.map((tipo) => ({
                  valor: tipo,
                  rotulo: ROTULO_INTERVENCAO[tipo],
                }))}
              />
            </Campo>
            <Campo etiqueta="Área aproximada (m²)" erro={formulario.erros.area_m2}>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={formulario.valores.area_m2 ?? ''}
                onChange={(evento) =>
                  formulario.definir(
                    'area_m2',
                    evento.target.value === '' ? null : Number(evento.target.value),
                  )
                }
                onBlur={() => formulario.aoSairDoCampo('area_m2')}
              />
            </Campo>
          </div>

          <Campo etiqueta="O que pretende fazer" erro={formulario.erros.mensagem} obrigatorio>
            <Textarea
              rows={5}
              value={formulario.valores.mensagem}
              onChange={(evento) => formulario.definir('mensagem', evento.target.value)}
              onBlur={() => formulario.aoSairDoCampo('mensagem')}
            />
          </Campo>

          <div>
            <p className="text-sm font-medium text-alc-black">
              Fotografias do espaço (até {MAXIMO_FOTOGRAFIAS})
            </p>
            <p className="mt-1 text-sm text-alc-ink">
              Ajudam-nos a perceber o trabalho antes da visita. JPEG, PNG ou WebP, até 10 MB cada.
            </p>
            <label className="toque mt-3 inline-flex cursor-pointer items-center gap-2 border border-alc-line bg-white px-4 text-sm">
              <ImagePlus aria-hidden className="size-5 text-alc-rose-dark" />
              {aProcessar ? 'A preparar fotografias…' : 'Escolher fotografias'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(evento) => {
                  void aoEscolherFicheiros(evento.target.files)
                  evento.target.value = ''
                }}
              />
            </label>

            {anexos.length > 0 ? (
              <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {anexos.map((anexo) => (
                  <li key={anexo.id} className="relative">
                    <img
                      src={anexo.miniatura}
                      alt={anexo.nome}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removerAnexo(anexo.id)}
                      aria-label={`Remover ${anexo.nome}`}
                      className="absolute right-1 top-1 flex size-8 items-center justify-center bg-alc-black/80 text-white"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <Checkbox
            marcado={formulario.valores.consentimento}
            invalido={Boolean(formulario.erros.consentimento)}
            aoMudar={(marcado) => formulario.definir('consentimento', marcado)}
          >
            {TEXTO_CONSENTIMENTO}{' '}
            <Link to="/politica-de-privacidade" className="text-alc-rose-deep underline underline-offset-4">
              Ler a política
            </Link>
          </Checkbox>
          {formulario.erros.consentimento ? (
            <p role="alert" className="text-sm font-medium text-alc-rose-deep">
              {formulario.erros.consentimento}
            </p>
          ) : null}

          <div aria-hidden className="absolute left-[-9999px]">
            <label htmlFor="empresa-website">Não preencher</label>
            <input
              id="empresa-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              onChange={(evento) => {
                armadilha.current = evento.target.value
              }}
            />
          </div>

          {erroEnvio ? <EstadoErro mensagem={erroEnvio} /> : null}

          <Button type="submit" tamanho="lg" ocupado={formulario.aSubmeter} className="w-full sm:w-auto">
            {formulario.aSubmeter ? 'A enviar…' : 'Enviar pedido'}
          </Button>
        </form>
      </div>
    </Seccao>
  )
}
