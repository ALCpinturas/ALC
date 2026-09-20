import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import Campo from '@/components/ui/Campo'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import RadioCards from '@/components/ui/RadioCards'
import { EstadoErro } from '@/components/ui/Estados'
import { calcularEstimativa } from '@/lib/calculo/estimativa'
import { primeiroNome } from '@/lib/format'
import { usePrecos } from '@/lib/hooks/usePrecos'
import { mensagemErro, supabase } from '@/lib/supabase'
import { TEXTO_CONSENTIMENTO } from '@/lib/schemas/comum'
import {
  ESTADOS_ESPACO,
  ROTULO_ESPACO,
  ROTULO_ESTADO_ESPACO,
  ROTULO_TRABALHO,
  TIPOS_ESPACO,
  TRABALHOS_CALCULADORA,
  passo1,
  passo2,
  passo3,
  passo4,
  passo5,
} from '@/lib/schemas/calculadora'
import { cn } from '@/lib/cn'
import Seccao from './Seccao'
import type { TipoEspaco } from '@/types/database'

const PASSOS = [passo1, passo2, passo3, passo4, passo5]
const TOTAL_PASSOS = PASSOS.length
const SEGUNDOS_MINIMOS = 3

type Valores = {
  tipo_espaco: string
  area_m2: number | null
  trabalhos: string[]
  estado_espaco: string
  localidade: string
  nome: string
  telefone: string
  email: string
  consentimento: boolean
}

const INICIAL: Valores = {
  tipo_espaco: '',
  area_m2: null,
  trabalhos: [],
  estado_espaco: '',
  localidade: '',
  nome: '',
  telefone: '',
  email: '',
  consentimento: false,
}

/*
 * A calculadora é um funil de angariação: recolhe o pedido em cinco passos e promete
 * contacto. A estimativa continua a ser calculada, mas só para a ficha da lead — o
 * visitante nunca vê valores, porque cada obra é orçamentada caso a caso.
 */
export default function Calculadora() {
  // As tabelas de preços já não são visíveis para o visitante. Se falharem, o pedido
  // grava na mesma e a lead fica sem estimativa, que o backoffice mostra como tal.
  const { precos, coeficientes } = usePrecos()
  const [passo, setPasso] = useState(0)
  const [valores, setValores] = useState<Valores>(INICIAL)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [leadId, setLeadId] = useState<string | null>(null)
  const [erroGravacao, setErroGravacao] = useState<string | null>(null)
  const [concluido, setConcluido] = useState(false)
  const [aGravar, setAGravar] = useState(false)
  const armadilha = useRef('')
  const abertoEm = useRef(Date.now())

  const multiplicador = useMemo(() => {
    const coeficiente = coeficientes.find((item) => item.chave === valores.estado_espaco)
    return coeficiente?.multiplicador ?? 1
  }, [coeficientes, valores.estado_espaco])

  const estimativa = useMemo(
    () =>
      calcularEstimativa({
        area_m2: valores.area_m2 ?? 0,
        trabalhos: valores.trabalhos,
        multiplicador,
        precos,
      }),
    [multiplicador, precos, valores.area_m2, valores.trabalhos],
  )

  /* Percorre as listas de origem em vez de indexar os rótulos com uma string solta:
   * dá o texto certo sem casts e mantém sempre a mesma ordem. */
  const resumo = useMemo(() => {
    const espaco = TIPOS_ESPACO.find((tipo) => tipo === valores.tipo_espaco)
    const estado = ESTADOS_ESPACO.find((item) => item === valores.estado_espaco)
    const trabalhos = TRABALHOS_CALCULADORA.filter((item) => valores.trabalhos.includes(item))
    return [
      { termo: 'Espaço', valor: espaco ? ROTULO_ESPACO[espaco] : '—' },
      { termo: 'Área', valor: valores.area_m2 ? `${valores.area_m2} m²` : '—' },
      { termo: 'Trabalhos', valor: trabalhos.map((item) => ROTULO_TRABALHO[item]).join(', ') || '—' },
      { termo: 'Estado', valor: estado ? ROTULO_ESTADO_ESPACO[estado] : '—' },
      { termo: 'Localidade', valor: valores.localidade },
      { termo: 'Contacto', valor: [valores.telefone, valores.email].filter(Boolean).join(' · ') },
    ]
  }, [
    valores.area_m2,
    valores.email,
    valores.estado_espaco,
    valores.localidade,
    valores.telefone,
    valores.tipo_espaco,
    valores.trabalhos,
  ])

  function validarPasso(indice: number): boolean {
    const esquema = PASSOS[indice]
    if (!esquema) return false
    const resultado = esquema.safeParse(valores)
    if (resultado.success) {
      setErros({})
      return true
    }
    const novos: Record<string, string> = {}
    for (const problema of resultado.error.issues) {
      const campo = problema.path[0]
      if (typeof campo === 'string' && !novos[campo]) novos[campo] = problema.message
    }
    setErros(novos)
    return false
  }

  async function gravarLead() {
    setErroGravacao(null)

    // Mesma proteção anti-abuso do formulário de contactos: um campo invisível que só um
    // robô preenche, e uma janela mínima entre abrir o formulário e submeter.
    if (armadilha.current !== '') return false
    if (Date.now() - abertoEm.current < SEGUNDOS_MINIMOS * 1000) {
      setErroGravacao('O pedido foi submetido demasiado depressa. Confirme os dados e tente de novo.')
      return false
    }

    setAGravar(true)

    // O id é gerado aqui e a gravação passa por uma função no servidor: o visitante
    // anónimo não lê nem escreve diretamente na tabela de leads. Uma linha por sessão,
    // e se a pessoa voltar atrás e recalcular a função atualiza em vez de duplicar.
    const id = leadId ?? crypto.randomUUID()

    const { error } = await supabase.rpc('gravar_lead_calculadora', {
      p_id: id,
      p_nome: valores.nome.trim(),
      p_telefone: valores.telefone.trim(),
      p_email: valores.email.trim(),
      p_localidade: valores.localidade.trim(),
      p_tipo_espaco: valores.tipo_espaco as TipoEspaco,
      p_area_m2: valores.area_m2 ?? 0,
      p_trabalhos: valores.trabalhos,
      p_estado_espaco: valores.estado_espaco,
      p_valor_cents: estimativa.valor_cents,
      p_consentimento_texto: TEXTO_CONSENTIMENTO,
    })

    setAGravar(false)
    if (error) {
      setErroGravacao(mensagemErro(error))
      return false
    }
    setLeadId(id)
    setConcluido(true)
    return true
  }

  function alternarTrabalho(chave: string) {
    setValores((anteriores) => ({
      ...anteriores,
      trabalhos: anteriores.trabalhos.includes(chave)
        ? anteriores.trabalhos.filter((item) => item !== chave)
        : [...anteriores.trabalhos, chave],
    }))
    setErros((anteriores) => ({ ...anteriores, trabalhos: '' }))
  }

  const nomeProprio = primeiroNome(valores.nome)
  const progresso = ((passo + (concluido ? 1 : 0)) / TOTAL_PASSOS) * 100

  return (
    <Seccao
      id="estimativa"
      fundo="branco"
      titulo="Quer um orçamento para a sua remodelação?"
      subtitulo="Responda a cinco perguntas rápidas. Entramos em contacto assim que possível com orçamentos."
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progresso)}
            aria-label="Progresso da estimativa"
            className="h-1 w-full bg-alc-grey"
          >
            <div
              className="h-full bg-alc-rose-dark transition-[width] duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-alc-ink">
            {concluido ? 'Pedido enviado' : `Passo ${passo + 1} de ${TOTAL_PASSOS}`}
          </p>
        </div>

        {!concluido ? (
          <div className="space-y-6">
            {passo === 0 ? (
              <fieldset>
                <legend className="mb-4 font-display text-xl">Que tipo de espaço é?</legend>
                <RadioCards
                  rotuloGrupo="Tipo de espaço"
                  colunas={2}
                  valor={valores.tipo_espaco}
                  aoMudar={(valor) => setValores((v) => ({ ...v, tipo_espaco: valor }))}
                  opcoes={TIPOS_ESPACO.map((tipo) => ({ valor: tipo, rotulo: ROTULO_ESPACO[tipo] }))}
                />
                {erros.tipo_espaco ? (
                  <p role="alert" className="mt-2 text-sm font-medium text-alc-rose-deep">
                    {erros.tipo_espaco}
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            {passo === 1 ? (
              <div>
                <h3 className="mb-4 font-display text-xl">Qual é a área aproximada?</h3>
                <Campo etiqueta="Área em metros quadrados" erro={erros.area_m2} obrigatorio>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={2000}
                    value={valores.area_m2 ?? ''}
                    onChange={(evento) =>
                      setValores((v) => ({
                        ...v,
                        area_m2: evento.target.value === '' ? null : Number(evento.target.value),
                      }))
                    }
                  />
                </Campo>
                <input
                  type="range"
                  min={10}
                  max={400}
                  step={5}
                  value={valores.area_m2 ?? 10}
                  onChange={(evento) =>
                    setValores((v) => ({ ...v, area_m2: Number(evento.target.value) }))
                  }
                  aria-label="Ajustar área com o deslizador"
                  className="mt-4 w-full accent-alc-rose-dark"
                />
              </div>
            ) : null}

            {passo === 2 ? (
              <fieldset>
                <legend className="mb-4 font-display text-xl">O que pretende fazer?</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TRABALHOS_CALCULADORA.map((trabalho) => {
                    const escolhido = valores.trabalhos.includes(trabalho)
                    return (
                      <button
                        key={trabalho}
                        type="button"
                        aria-pressed={escolhido}
                        onClick={() => alternarTrabalho(trabalho)}
                        className={cn(
                          'toque rounded-[2px] border px-4 text-left transition-colors',
                          escolhido
                            ? 'border-alc-rose-dark bg-alc-rose-light'
                            : 'border-alc-line hover:border-alc-rose-dark',
                        )}
                      >
                        {ROTULO_TRABALHO[trabalho]}
                      </button>
                    )
                  })}
                </div>
                {erros.trabalhos ? (
                  <p role="alert" className="mt-2 text-sm font-medium text-alc-rose-deep">
                    {erros.trabalhos}
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            {passo === 3 ? (
              <fieldset>
                <legend className="mb-4 font-display text-xl">Qual é o estado atual do espaço?</legend>
                <RadioCards
                  rotuloGrupo="Estado do espaço"
                  valor={valores.estado_espaco}
                  aoMudar={(valor) => setValores((v) => ({ ...v, estado_espaco: valor }))}
                  opcoes={ESTADOS_ESPACO.map((estado) => ({
                    valor: estado,
                    rotulo: ROTULO_ESTADO_ESPACO[estado],
                  }))}
                />
                {erros.estado_espaco ? (
                  <p role="alert" className="mt-2 text-sm font-medium text-alc-rose-deep">
                    {erros.estado_espaco}
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            {passo === 4 ? (
              <div className="space-y-4">
                <h3 className="font-display text-xl">Como podemos falar consigo?</h3>
                <Campo etiqueta="Localidade" erro={erros.localidade} obrigatorio>
                  <Input
                    value={valores.localidade}
                    autoComplete="address-level2"
                    onChange={(evento) =>
                      setValores((v) => ({ ...v, localidade: evento.target.value }))
                    }
                  />
                </Campo>
                <Campo etiqueta="Nome" erro={erros.nome} obrigatorio>
                  <Input
                    value={valores.nome}
                    autoComplete="name"
                    onChange={(evento) => setValores((v) => ({ ...v, nome: evento.target.value }))}
                  />
                </Campo>
                <Campo etiqueta="Telefone" erro={erros.telefone} obrigatorio>
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={valores.telefone}
                    onChange={(evento) =>
                      setValores((v) => ({ ...v, telefone: evento.target.value }))
                    }
                  />
                </Campo>
                <Campo etiqueta="Email" erro={erros.email} obrigatorio>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={valores.email}
                    onChange={(evento) => setValores((v) => ({ ...v, email: evento.target.value }))}
                  />
                </Campo>
                <Checkbox
                  marcado={valores.consentimento}
                  invalido={Boolean(erros.consentimento)}
                  aoMudar={(marcado) => setValores((v) => ({ ...v, consentimento: marcado }))}
                >
                  {TEXTO_CONSENTIMENTO}{' '}
                  <Link to="/politica-de-privacidade" className="text-alc-rose-deep underline underline-offset-4">
                    Ler a política
                  </Link>
                </Checkbox>
                {erros.consentimento ? (
                  <p role="alert" className="text-sm font-medium text-alc-rose-deep">
                    {erros.consentimento}
                  </p>
                ) : null}
                <div aria-hidden className="absolute left-[-9999px]">
                  <label htmlFor="empresa-website-calculadora">Não preencher</label>
                  <input
                    id="empresa-website-calculadora"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    onChange={(evento) => {
                      armadilha.current = evento.target.value
                    }}
                  />
                </div>

                {erroGravacao ? <EstadoErro mensagem={erroGravacao} /> : null}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-between">
              <Button
                variante="fantasma"
                tamanho="lg"
                onClick={() => setPasso((atual) => Math.max(0, atual - 1))}
                disabled={passo === 0}
              >
                Anterior
              </Button>
              <Button
                tamanho="lg"
                ocupado={aGravar}
                onClick={() => {
                  if (!validarPasso(passo)) return
                  if (passo === TOTAL_PASSOS - 1) {
                    void gravarLead()
                  } else {
                    setPasso((atual) => atual + 1)
                  }
                }}
              >
                {passo === TOTAL_PASSOS - 1 ? 'Enviar pedido' : 'Seguinte'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border border-alc-rose-dark bg-alc-rose-light p-6">
              <p className="flex items-center gap-2 text-sm uppercase tracking-wider text-alc-black">
                <Check aria-hidden className="size-4" />
                Pedido recebido
              </p>
              <p className="mt-3 font-display text-2xl text-alc-black sm:text-3xl">
                Obrigado{nomeProprio ? `, ${nomeProprio}` : ''}.
              </p>
              <p className="mt-2 text-alc-black">
                Vamos ver o seu caso e entramos em contacto assim que possível com orçamentos.
              </p>
            </div>

            <div className="border-l-2 border-alc-rose-dark bg-alc-grey p-4 text-sm text-alc-black">
              <h3 className="font-medium">O que nos enviou</h3>
              <dl className="mt-3 space-y-1.5">
                {resumo.map((linha) => (
                  <div key={linha.termo} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                    <dt className="shrink-0 text-alc-ink sm:w-28">{linha.termo}</dt>
                    <dd className="break-words">{linha.valor || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <Button
              variante="secundario"
              tamanho="lg"
              onClick={() => {
                setConcluido(false)
                setPasso(0)
              }}
            >
              Corrigir os dados
            </Button>
          </div>
        )}
      </div>
    </Seccao>
  )
}
