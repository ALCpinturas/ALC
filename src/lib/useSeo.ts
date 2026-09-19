import { useEffect } from 'react'

interface Seo {
  titulo: string
  descricao: string
  /** Rotas de administração nunca entram em motores de busca. */
  naoIndexar?: boolean
}

function definirMeta(seletor: string, atributo: string, valor: string, conteudo: string) {
  let etiqueta = document.head.querySelector<HTMLMetaElement>(seletor)
  if (!etiqueta) {
    etiqueta = document.createElement('meta')
    etiqueta.setAttribute(atributo, valor)
    document.head.appendChild(etiqueta)
  }
  etiqueta.setAttribute('content', conteudo)
}

export function useSeo({ titulo, descricao, naoIndexar = false }: Seo): void {
  useEffect(() => {
    document.title = titulo
    definirMeta('meta[name="description"]', 'name', 'description', descricao)
    definirMeta('meta[property="og:title"]', 'property', 'og:title', titulo)
    definirMeta('meta[property="og:description"]', 'property', 'og:description', descricao)
    definirMeta('meta[property="og:type"]', 'property', 'og:type', 'website')
    definirMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')

    const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (naoIndexar) {
      definirMeta('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow')
    } else if (robots) {
      robots.remove()
    }
  }, [titulo, descricao, naoIndexar])
}
