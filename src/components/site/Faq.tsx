import Accordion, { type ItemAcordeao } from '@/components/ui/Accordion'
import { EMPRESA } from '@/lib/empresa'
import Seccao from './Seccao'

const PERGUNTAS: ItemAcordeao[] = [
  {
    id: 'obras-completas',
    pergunta: 'Fazem obras completas?',
    resposta:
      'Sim, a ALC trabalha principalmente nas áreas de pintura, pladur, pavimentos e acabamentos, podendo coordenar diferentes trabalhos de acordo com as necessidades do projeto.',
  },
  {
    id: 'trabalhos-pequenos',
    pergunta: 'Fazem trabalhos pequenos?',
    resposta: 'Sim, avaliamos cada pedido individualmente.',
  },
  {
    id: 'orcamento-gratuito',
    pergunta: 'Fazem orçamento gratuito?',
    resposta:
      'Sim. Pode enviar-nos o pedido em poucos passos aqui no site e, quando necessário, fazemos uma avaliação do espaço antes de apresentar a proposta.',
  },
  {
    id: 'materiais-cliente',
    pergunta: 'Trabalham com materiais fornecidos pelo cliente?',
    resposta:
      'A avaliar caso a caso, podemos também aconselhar e fornecer os materiais adequados ao projeto.',
  },
  {
    id: 'duracao',
    pergunta: 'Quanto tempo demora uma obra?',
    resposta:
      'Depende da dimensão, estado do espaço e trabalhos envolvidos, após avaliação apresentamos uma previsão de execução.',
  },
  {
    id: 'zonas',
    pergunta: 'Trabalham em que zonas?',
    resposta: EMPRESA.zonasServidas,
  },
]

export default function Faq() {
  return (
    <Seccao id="faq" fundo="branco" titulo="Perguntas frequentes">
      <Accordion itens={PERGUNTAS} />
    </Seccao>
  )
}
