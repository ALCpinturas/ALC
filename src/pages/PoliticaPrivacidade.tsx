import Footer from '@/components/site/Footer'
import Header from '@/components/site/Header'
import { EMPRESA } from '@/lib/empresa'
import { formatarNif } from '@/lib/format'
import { useSeo } from '@/lib/useSeo'

export default function PoliticaPrivacidade() {
  useSeo({
    titulo: 'Política de Privacidade — ALC',
    descricao: 'Como a ALC trata os dados pessoais recolhidos através do site.',
  })

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 md:px-6 md:pt-36">
        <h1 className="font-display text-4xl text-alc-black">Política de Privacidade</h1>

        <div className="mt-10 space-y-8 text-alc-ink">
          <section>
            <h2 className="font-display text-2xl text-alc-black">Responsável pelo tratamento</h2>
            <p className="mt-2">
              ALC é o nome com que trabalham três profissionais independentes, e não uma
              sociedade. O responsável pelo tratamento dos dados recolhidos neste site é{' '}
              {EMPRESA.responsavel}, NIF {formatarNif(EMPRESA.nif)}, com morada em {EMPRESA.morada},{' '}
              {EMPRESA.codigoPostal} {EMPRESA.localidade}. Contacto: {EMPRESA.telefone},{' '}
              {EMPRESA.email}.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-alc-black">Dados recolhidos</h2>
            <p className="mt-2">
              Nome, telefone, email, localidade, dados sobre o espaço a intervencionar (tipo, área,
              estado) e, quando as anexa, fotografias do espaço. No caso da estimativa online,
              recolhemos também os trabalhos pretendidos e o intervalo de valores calculado.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-alc-black">Finalidades</h2>
            <p className="mt-2">
              Responder ao pedido de orçamento, preparar e apresentar propostas, e gerir a relação
              com o cliente durante a execução da obra. Não utilizamos os seus dados para
              publicidade nem os vendemos a terceiros.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-alc-black">Fundamento legal</h2>
            <p className="mt-2">
              O seu consentimento, recolhido no momento do envio do formulário, e o interesse
              legítimo na gestão da relação pré-contratual e contratual.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-alc-black">Prazos de conservação</h2>
            <p className="mt-2">
              Pedidos que não deem origem a obra são conservados durante 2 anos. Dados de clientes
              com obra executada são conservados durante os prazos legais de conservação de
              documentos fiscais e contabilísticos, atualmente 10 anos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-alc-black">Subcontratantes</h2>
            <p className="mt-2">
              Utilizamos a Supabase para alojamento da base de dados e das fotografias, com
              infraestrutura na União Europeia, e a Resend para envio de email transacional. Ambos
              tratam os dados apenas segundo as nossas instruções.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-alc-black">Os seus direitos</h2>
            <p className="mt-2">
              Pode pedir o acesso, a retificação, o apagamento, a limitação do tratamento, a
              portabilidade e a oposição ao tratamento dos seus dados, bastando contactar-nos pelos
              meios indicados acima. Pode também apresentar reclamação junto da Comissão Nacional de
              Proteção de Dados (CNPD).
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-alc-black">Cookies</h2>
            <p className="mt-2">
              Este site não utiliza cookies de terceiros, publicidade nem ferramentas de análise de
              tráfego. Só existem os dados que nos envia pelos formulários.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
