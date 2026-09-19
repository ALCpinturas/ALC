import Seccao from './Seccao'

const PASSOS = [
  {
    numero: '01',
    titulo: 'Falamos consigo',
    texto: 'Percebemos o que pretende, as necessidades do espaço e o resultado que procura.',
  },
  {
    numero: '02',
    titulo: 'Avaliamos o espaço',
    texto: 'Fazemos uma análise das condições existentes e das características da obra.',
  },
  {
    numero: '03',
    titulo: 'Apresentamos a proposta',
    texto: 'Recebe um orçamento claro, com os trabalhos e materiais previstos.',
  },
  {
    numero: '04',
    titulo: 'Planeamos a obra',
    texto: 'Definimos as etapas, materiais e prazos antes de começar.',
  },
  {
    numero: '05',
    titulo: 'Executamos',
    texto: 'Acompanhamos a obra e mantemos o foco na qualidade dos trabalhos e dos acabamentos.',
  },
  {
    numero: '06',
    titulo: 'Entregamos',
    texto: 'Fazemos a revisão final e garantimos que os detalhes ficam tratados.',
  },
]

export default function ComoTrabalhamos() {
  return (
    <Seccao id="como-trabalhamos" fundo="branco" titulo="Como trabalhamos">
      <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {PASSOS.map((passo) => (
          <li key={passo.numero} className="relative overflow-hidden pt-6">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-2 left-0 font-display text-7xl leading-none text-alc-rose-light"
            >
              {passo.numero}
            </span>
            <div className="relative">
              <h3 className="font-display text-xl text-alc-black">{passo.titulo}</h3>
              <p className="mt-2 text-alc-ink">{passo.texto}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-12 font-display text-2xl text-alc-black">Do primeiro contacto ao último detalhe.</p>
    </Seccao>
  )
}
