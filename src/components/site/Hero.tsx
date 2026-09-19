import Button from '@/components/ui/Button'
import ImagemSite from './ImagemSite'

const FRENTES = ['Pintura', 'Pladur', 'Pavimentos', 'Acabamentos']

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-[85dvh] items-center overflow-hidden bg-alc-grey px-4 pb-16 pt-24 md:px-6 md:pt-28"
    >
      <div className="absolute inset-0" aria-hidden>
        <ImagemSite chave="hero" prioritario largura={1920} altura={1080} />
        <div className="absolute inset-0 bg-gradient-to-r from-alc-grey via-alc-grey/92 to-alc-grey/25 md:to-transparent" />
      </div>
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="max-w-xl">
          <p className="wordmark text-xs text-alc-rose-deep">{FRENTES.join(' · ')}</p>
          <h1 className="mt-6 font-display text-4xl leading-[1.1] text-alc-black sm:text-5xl md:text-6xl">
            Remodelamos espaços.
            <br />
            Criamos lugares para viver.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-alc-ink">
            Na ALC juntámos experiência, profissionalismo e gosto pelo trabalho bem feito para
            transformar casas e espaços comerciais.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild tamanho="lg">
              <a href="#contactos">Pedir orçamento</a>
            </Button>
            <Button asChild variante="secundario" tamanho="lg">
              <a href="#portefolio">Ver trabalhos</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
