import { Link } from 'react-router'
import { EMPRESA } from '@/lib/empresa'
import Logo from './Logo'

const FRENTES = ['Pintura', 'Tetos falsos e divisórias', 'Pavimentos', 'Acabamentos']

export default function Footer() {
  const ano = new Date().getFullYear()

  return (
    <footer className="border-t border-alc-line bg-alc-grey">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <Logo variante="lockup" altura={96} />
          <p className="mt-4 max-w-xs text-sm text-alc-ink">
            Remodelação de edifícios. Experiência que se vê, trabalho que fica.
          </p>
        </div>

        <div>
          <h2 className="wordmark text-xs text-alc-ink">Serviços</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {FRENTES.map((frente) => (
              <li key={frente}>{frente}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="wordmark text-xs text-alc-ink">Contactos</h2>
          <address className="mt-4 space-y-2 text-sm not-italic">
            <p>{EMPRESA.responsavel}</p>
            <p>
              {EMPRESA.morada}
              <br />
              {EMPRESA.codigoPostal} {EMPRESA.localidade}
            </p>
            <p>
              <a
                href={`tel:+351${EMPRESA.telefone.replace(/\s/g, '')}`}
                className="text-alc-rose-deep underline underline-offset-4"
              >
                {EMPRESA.telefone}
              </a>
            </p>
            <p className="text-alc-ink">Zonas servidas: {EMPRESA.zonasServidas}</p>
          </address>
        </div>
      </div>

      <div className="border-t border-alc-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-alc-ink sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p>
            © {ano} ALC, {EMPRESA.nomeCompleto}. Todos os direitos reservados.
          </p>
          <nav aria-label="Informação legal" className="flex flex-wrap gap-4">
            <Link to="/politica-de-privacidade" className="underline underline-offset-4">
              Política de Privacidade
            </Link>
            <Link to="/termos-e-condicoes" className="underline underline-offset-4">
              Termos e Condições
            </Link>
            <Link to="/admin" className="underline underline-offset-4">
              Área reservada
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
