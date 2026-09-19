/** CSV para Excel português: separador ponto e vírgula e UTF-8 com BOM. */
export function descarregarCsv(
  nomeFicheiro: string,
  cabecalhos: readonly string[],
  linhas: readonly (readonly (string | number | null)[])[],
): void {
  const escapar = (valor: string | number | null): string => {
    const texto = valor === null ? '' : String(valor)
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }

  const conteudo = [cabecalhos, ...linhas]
    .map((linha) => linha.map(escapar).join(';'))
    .join('\r\n')

  const blob = new Blob([`\uFEFF${conteudo}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const ligacao = document.createElement('a')
  ligacao.href = url
  ligacao.download = nomeFicheiro
  document.body.appendChild(ligacao)
  ligacao.click()
  document.body.removeChild(ligacao)
  URL.revokeObjectURL(url)
}
