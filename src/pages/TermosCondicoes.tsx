import Footer from '@/components/site/Footer'
import Header from '@/components/site/Header'
import { useSeo } from '@/lib/useSeo'

export default function TermosCondicoes() {
  useSeo({
    titulo: 'Termos e Condições — ALC',
    descricao: 'Âmbito dos serviços, natureza das estimativas e lei aplicável.',
  })

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 md:px-6 md:pt-36">
        <h1 className="font-display text-4xl text-alc-black">Termos e Condições</h1>

        <div className="mt-10 space-y-8 text-alc-ink">
          <section>
            <h2 className="font-display text-2xl text-alc-black">Âmbito dos serviços</h2>
            <p className="mt-2">
              A ALC presta serviços de remodelação de edifícios, nomeadamente pintura, tetos falsos
              e divisórias em pladur, pavimentos e acabamentos. O âmbito concreto de cada obra é o
              que estiver descrito no orçamento aceite.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-alc-black">Estimativas online</h2>
            <p className="mt-2">
              A estimativa disponibilizada neste site é meramente indicativa e não constitui
              proposta contratual. O valor final depende das condições reais do espaço, dos
              materiais escolhidos e dos trabalhos necessários, e só é fixado em orçamento escrito.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-alc-black">Imagens</h2>
            <p className="mt-2">
              As fotografias de obras publicadas neste site são propriedade da ALC e foram
              publicadas com autorização dos respetivos clientes. Não podem ser reproduzidas sem
              autorização escrita.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-alc-black">Lei aplicável</h2>
            <p className="mt-2">
              Aplica-se a lei portuguesa. Para a resolução de litígios de consumo, o consumidor pode
              recorrer às entidades de resolução alternativa de litígios legalmente competentes.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
