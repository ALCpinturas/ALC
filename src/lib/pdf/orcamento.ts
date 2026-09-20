import { EMPRESA } from '@/lib/empresa'
import { formatarData, formatarEuros, formatarNif, formatarNumero } from '@/lib/format'
import { ROTULO_UNIDADE } from '@/lib/calculo/orcamento'
import type { ClienteRow, ObraRow, OrcamentoLinhaRow, OrcamentoRow } from '@/types/database'

const PRETO: [number, number, number] = [26, 26, 26]
const ROSA_FUNDO: [number, number, number] = [122, 79, 66]
const CINZA: [number, number, number] = [236, 235, 233]

const MARGEM = 20
const LARGURA_A4 = 210
const ALTURA_A4 = 297

/** Proporção real de logo-alc-monograma.png (212×250), para o logótipo nunca ficar distorcido. */
const LOGO_RACIO = 212 / 250
const LOGO_ALTURA = 15

async function carregarLogoComoDataUrl(): Promise<string | null> {
  try {
    const resposta = await fetch('/logo-alc-monograma.png')
    if (!resposta.ok) return null
    const blob = await resposta.blob()
    return await new Promise((resolve, reject) => {
      const leitor = new FileReader()
      leitor.onload = () => resolve(leitor.result as string)
      leitor.onerror = () => reject(new Error('Falha ao ler o logótipo.'))
      leitor.readAsDataURL(blob)
    })
  } catch {
    // Sem logótipo, o PDF continua a gerar-se só com o texto do cabeçalho.
    return null
  }
}

interface DadosPdf {
  orcamento: OrcamentoRow
  cliente: ClienteRow
  /** Pode não existir: orçamenta-se ao cliente e a obra liga-se depois, se for aceite. */
  obra: ObraRow | null
  linhas: OrcamentoLinhaRow[]
}

/**
 * As fontes por defeito do jsPDF usam WinAnsi, que cobre os acentos do português e o símbolo
 * do euro. Para controlo tipográfico completo, registe aqui uma TrueType em base64 e troque
 * as chamadas setFont: ver README, secção "Fonte do PDF".
 */
function texto(
  doc: import('jspdf').jsPDF,
  valor: string,
  x: number,
  y: number,
  opcoes?: { tamanho?: number; negrito?: boolean; alinhamento?: 'left' | 'right' | 'center'; cor?: [number, number, number] },
) {
  doc.setFont('helvetica', opcoes?.negrito ? 'bold' : 'normal')
  doc.setFontSize(opcoes?.tamanho ?? 9)
  const cor = opcoes?.cor ?? PRETO
  doc.setTextColor(cor[0], cor[1], cor[2])
  doc.text(valor, x, y, { align: opcoes?.alinhamento ?? 'left' })
}

export async function gerarPdfOrcamento({
  orcamento,
  cliente,
  obra,
  linhas,
}: DadosPdf): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logoDataUrl = await carregarLogoComoDataUrl()

  const colunas = {
    descricao: MARGEM,
    unidade: 112,
    quantidade: 136,
    preco: 162,
    total: LARGURA_A4 - MARGEM,
  }

  let y = MARGEM

  function cabecalhoPagina() {
    const logoLargura = LOGO_ALTURA * LOGO_RACIO
    let xTexto = MARGEM

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', MARGEM, y - 2, logoLargura, LOGO_ALTURA)
      xTexto = MARGEM + logoLargura + 4
    }

    texto(doc, EMPRESA.nome, xTexto, y + 4, { tamanho: 20, negrito: true, cor: ROSA_FUNDO })
    // Quem emite é a pessoa singular, não uma empresa: é o nome dela que identifica o documento.
    texto(doc, EMPRESA.responsavel, xTexto, y + 9, { tamanho: 8 })

    const direita = LARGURA_A4 - MARGEM
    texto(doc, EMPRESA.morada, direita, y, { tamanho: 8, alinhamento: 'right' })
    texto(doc, `${EMPRESA.codigoPostal} ${EMPRESA.localidade}`, direita, y + 4, {
      tamanho: 8,
      alinhamento: 'right',
    })
    texto(doc, `NIF ${formatarNif(EMPRESA.nif)}`, direita, y + 8, { tamanho: 8, alinhamento: 'right' })
    texto(doc, EMPRESA.telefone, direita, y + 12, { tamanho: 8, alinhamento: 'right' })

    y += 22
    doc.setDrawColor(ROSA_FUNDO[0], ROSA_FUNDO[1], ROSA_FUNDO[2])
    doc.setLineWidth(0.6)
    doc.line(MARGEM, y, LARGURA_A4 - MARGEM, y)
    doc.setLineWidth(0.2)
    y += 8
  }

  function cabecalhoTabela() {
    doc.setFillColor(CINZA[0], CINZA[1], CINZA[2])
    doc.rect(MARGEM, y - 4, LARGURA_A4 - MARGEM * 2, 7, 'F')
    texto(doc, 'Descrição', colunas.descricao + 1, y, { tamanho: 8, negrito: true })
    texto(doc, 'Un.', colunas.unidade, y, { tamanho: 8, negrito: true })
    texto(doc, 'Qtd.', colunas.quantidade, y, { tamanho: 8, negrito: true, alinhamento: 'right' })
    texto(doc, 'Preço un.', colunas.preco, y, { tamanho: 8, negrito: true, alinhamento: 'right' })
    texto(doc, 'Total', colunas.total, y, { tamanho: 8, negrito: true, alinhamento: 'right' })
    y += 8
  }

  function novaPagina() {
    doc.addPage()
    y = MARGEM
    cabecalhoPagina()
    cabecalhoTabela()
  }

  cabecalhoPagina()

  texto(doc, 'ORÇAMENTO', MARGEM, y, { tamanho: 14, negrito: true })
  texto(doc, `N.º ${orcamento.numero} · versão ${orcamento.versao}`, MARGEM, y + 5, { tamanho: 9 })
  texto(
    doc,
    `Data de emissão: ${formatarData(orcamento.data_emissao ?? new Date())}`,
    LARGURA_A4 - MARGEM,
    y,
    { tamanho: 9, alinhamento: 'right' },
  )
  texto(doc, `Validade: ${orcamento.validade_dias} dias`, LARGURA_A4 - MARGEM, y + 5, {
    tamanho: 9,
    alinhamento: 'right',
  })
  y += 14

  texto(doc, 'Cliente', MARGEM, y, { tamanho: 8, negrito: true, cor: ROSA_FUNDO })
  y += 5
  texto(doc, cliente.nome, MARGEM, y, { tamanho: 9 })
  y += 4
  if (cliente.morada) {
    texto(doc, cliente.morada, MARGEM, y, { tamanho: 9 })
    y += 4
  }
  if (cliente.codigo_postal || cliente.localidade) {
    texto(doc, `${cliente.codigo_postal ?? ''} ${cliente.localidade ?? ''}`.trim(), MARGEM, y, {
      tamanho: 9,
    })
    y += 4
  }
  if (cliente.nif) {
    texto(doc, `NIF ${formatarNif(cliente.nif)}`, MARGEM, y, { tamanho: 9 })
    y += 4
  }

  if (obra) {
    y += 4
    texto(doc, `Obra: ${obra.titulo}`, MARGEM, y, { tamanho: 9, negrito: true })
    if (obra.morada || obra.localidade) {
      y += 4
      texto(doc, `${obra.morada ?? ''}${obra.localidade ? `, ${obra.localidade}` : ''}`, MARGEM, y, {
        tamanho: 9,
      })
    }
  }

  y += 10
  cabecalhoTabela()

  let capituloAtual = ''
  for (const linha of linhas) {
    if (linha.capitulo !== capituloAtual) {
      if (y > ALTURA_A4 - 50) novaPagina()
      capituloAtual = linha.capitulo
      y += 2
      texto(doc, capituloAtual, MARGEM, y, { tamanho: 9, negrito: true, cor: ROSA_FUNDO })
      y += 6
    }

    const partes = doc.splitTextToSize(linha.descricao, 86) as string[]
    const alturaLinha = Math.max(5, partes.length * 4 + 1)

    // Nunca cortar uma linha a meio entre páginas.
    if (y + alturaLinha > ALTURA_A4 - 45) novaPagina()

    texto(doc, partes.join('\n'), colunas.descricao, y, { tamanho: 9 })
    texto(doc, ROTULO_UNIDADE[linha.unidade], colunas.unidade, y, { tamanho: 9 })
    texto(doc, formatarNumero(linha.quantidade), colunas.quantidade, y, {
      tamanho: 9,
      alinhamento: 'right',
    })
    texto(doc, formatarEuros(linha.preco_unitario_cents), colunas.preco, y, {
      tamanho: 9,
      alinhamento: 'right',
    })
    texto(doc, formatarEuros(linha.total_linha_cents), colunas.total, y, {
      tamanho: 9,
      alinhamento: 'right',
    })
    y += alturaLinha
  }

  if (y > ALTURA_A4 - 70) novaPagina()

  y += 6
  doc.setDrawColor(CINZA[0], CINZA[1], CINZA[2])
  doc.line(120, y, LARGURA_A4 - MARGEM, y)
  y += 6

  const totaisPdf: [string, string][] = [
    ['Subtotal', formatarEuros(orcamento.subtotal_cents)],
    ['Desconto', formatarEuros(orcamento.desconto_cents)],
    [`IVA ${orcamento.iva_taxa}%`, formatarEuros(orcamento.iva_cents)],
  ]
  for (const [rotulo, valor] of totaisPdf) {
    texto(doc, rotulo, 150, y, { tamanho: 9, alinhamento: 'right' })
    texto(doc, valor, LARGURA_A4 - MARGEM, y, { tamanho: 9, alinhamento: 'right' })
    y += 5
  }
  texto(doc, 'TOTAL', 150, y + 2, { tamanho: 11, negrito: true, alinhamento: 'right' })
  texto(doc, formatarEuros(orcamento.total_cents), LARGURA_A4 - MARGEM, y + 2, {
    tamanho: 11,
    negrito: true,
    alinhamento: 'right',
  })
  y += 14

  if (orcamento.condicoes) {
    if (y > ALTURA_A4 - 50) novaPagina()
    texto(doc, 'Condições', MARGEM, y, { tamanho: 9, negrito: true, cor: ROSA_FUNDO })
    y += 5
    const condicoes = doc.splitTextToSize(orcamento.condicoes, LARGURA_A4 - MARGEM * 2) as string[]
    texto(doc, condicoes.join('\n'), MARGEM, y, { tamanho: 8 })
  }

  const paginas = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina)
    texto(
      doc,
      `Orçamento válido por ${orcamento.validade_dias} dias a contar da data de emissão.`,
      MARGEM,
      ALTURA_A4 - 12,
      { tamanho: 7 },
    )
    texto(doc, `Página ${pagina} de ${paginas}`, LARGURA_A4 - MARGEM, ALTURA_A4 - 12, {
      tamanho: 7,
      alinhamento: 'right',
    })
  }

  return doc.output('blob')
}
