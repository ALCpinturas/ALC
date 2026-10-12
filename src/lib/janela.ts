/**
 * Separador aberto já no clique, para ser preenchido depois de um `await`.
 *
 * O Safari do iPhone só deixa `window.open` correr dentro do gesto do utilizador: chamado
 * depois de gerar um PDF ou de esperar por uma Edge Function, é bloqueado em silêncio.
 * Abre-se por isso o separador em branco logo no clique e só depois se lhe dá o destino.
 */
export interface JanelaPendente {
  ir: (url: string) => void
  fechar: () => void
}

export function abrirJanelaPendente(): JanelaPendente {
  const janela = window.open('', '_blank')
  if (janela) janela.opener = null

  return {
    ir(url) {
      if (janela && !janela.closed) janela.location.href = url
      else window.location.assign(url)
    },
    fechar() {
      janela?.close()
    },
  }
}
