import ImagemSite from './ImagemSite'
import Seccao from './Seccao'

export default function Sobre() {
  return (
    <Seccao id="sobre" fundo="branco">
      <div className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
        <div>
          <h2 className="font-display text-3xl leading-tight text-alc-black md:text-4xl">
            Três amigos. Uma profissão. O mesmo compromisso.
          </h2>
          <p className="mt-6 text-lg text-alc-ink">
            A ALC nasceu da união de três amigos com experiência na área das remodelações e uma
            visão comum, fazer um trabalho de que nos possamos orgulhar. Acompanhamos cada projeto
            de perto, desde a primeira visita até ao último acabamento. Para nós, uma remodelação
            não é apenas executar uma lista de trabalhos, é perceber o espaço, encontrar as soluções
            certas e entregar um resultado cuidado.
          </p>
        </div>
        <figure className="relative">
          <div className="aspect-[4/3] overflow-hidden bg-alc-grey">
            <ImagemSite chave="sobre" largura={1200} altura={900} />
          </div>
          <figcaption className="mt-4 border-l-2 border-alc-rose-dark pl-6 font-display text-2xl leading-snug text-alc-black md:text-3xl">
            Experiência que se vê.
            <br />
            Trabalho que fica.
          </figcaption>
        </figure>
      </div>
    </Seccao>
  )
}
