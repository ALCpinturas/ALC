import AntesDepois from '@/components/site/AntesDepois'
import Calculadora from '@/components/site/Calculadora'
import ComoTrabalhamos from '@/components/site/ComoTrabalhamos'
import Contactos from '@/components/site/Contactos'
import Faq from '@/components/site/Faq'
import Footer from '@/components/site/Footer'
import Header from '@/components/site/Header'
import Hero from '@/components/site/Hero'
import PorqueALC from '@/components/site/PorqueALC'
import Portefolio from '@/components/site/Portefolio'
import Servicos from '@/components/site/Servicos'
import Sobre from '@/components/site/Sobre'
import { ImagensSiteProvider } from '@/lib/hooks/useImagensSite'
import { useSeo } from '@/lib/useSeo'

export default function Home() {
  useSeo({
    titulo: 'ALC — Remodelação de edifícios em Portugal',
    descricao:
      'Pintura, tetos falsos e divisórias em pladur, pavimentos e acabamentos. Orçamentos claros e acompanhamento em cada fase da obra.',
  })

  return (
    <ImagensSiteProvider>
      <Header />
      <main>
        <Hero />
        <Sobre />
        <Servicos />
        <ComoTrabalhamos />
        <Portefolio />
        <AntesDepois />
        <PorqueALC />
        <Calculadora />
        <Faq />
        <Contactos />
      </main>
      <Footer />
    </ImagensSiteProvider>
  )
}
