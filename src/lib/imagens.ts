/**
 * Compressão de imagens no cliente.
 *
 * Fotografias de telemóvel chegam deitadas e com EXIF, incluindo GPS. Desenhar num canvas
 * e reexportar resolve as duas coisas: aplica a orientação e descarta todos os metadados,
 * porque o canvas só conhece pixéis.
 */

export interface ImagemComprimida {
  ficheiro: File
  largura: number
  altura: number
}

export interface OpcoesCompressao {
  larguraMaxima: number
  qualidade: number
}

async function lerOrientacaoExif(ficheiro: File): Promise<number> {
  const inicio = await ficheiro.slice(0, 128 * 1024).arrayBuffer()
  const vista = new DataView(inicio)
  if (vista.byteLength < 4 || vista.getUint16(0, false) !== 0xffd8) return 1

  let posicao = 2
  while (posicao + 4 < vista.byteLength) {
    const marcador = vista.getUint16(posicao, false)
    const tamanho = vista.getUint16(posicao + 2, false)
    if (marcador === 0xffe1) {
      const inicioTiff = posicao + 10
      if (inicioTiff + 8 > vista.byteLength) return 1
      const little = vista.getUint16(inicioTiff, false) === 0x4949
      const offsetIfd = vista.getUint32(inicioTiff + 4, little)
      const inicioIfd = inicioTiff + offsetIfd
      if (inicioIfd + 2 > vista.byteLength) return 1
      const entradas = vista.getUint16(inicioIfd, little)
      for (let i = 0; i < entradas; i += 1) {
        const entrada = inicioIfd + 2 + i * 12
        if (entrada + 12 > vista.byteLength) break
        if (vista.getUint16(entrada, little) === 0x0112) {
          return vista.getUint16(entrada + 8, little) || 1
        }
      }
      return 1
    }
    if ((marcador & 0xff00) !== 0xff00) break
    posicao += 2 + tamanho
  }
  return 1
}

function dimensoesAposRotacao(largura: number, altura: number, orientacao: number) {
  return orientacao >= 5 && orientacao <= 8
    ? { largura: altura, altura: largura }
    : { largura, altura }
}

function aplicarOrientacao(
  contexto: CanvasRenderingContext2D,
  orientacao: number,
  largura: number,
  altura: number,
) {
  switch (orientacao) {
    case 2:
      contexto.transform(-1, 0, 0, 1, largura, 0)
      break
    case 3:
      contexto.transform(-1, 0, 0, -1, largura, altura)
      break
    case 4:
      contexto.transform(1, 0, 0, -1, 0, altura)
      break
    case 5:
      contexto.transform(0, 1, 1, 0, 0, 0)
      break
    case 6:
      contexto.transform(0, 1, -1, 0, largura, 0)
      break
    case 7:
      contexto.transform(0, -1, -1, 0, largura, altura)
      break
    case 8:
      contexto.transform(0, -1, 1, 0, 0, altura)
      break
    default:
      break
  }
}

function carregarImagem(ficheiro: File): Promise<HTMLImageElement> {
  return new Promise((resolver, rejeitar) => {
    const url = URL.createObjectURL(ficheiro)
    const imagem = new Image()
    imagem.onload = () => {
      URL.revokeObjectURL(url)
      resolver(imagem)
    }
    imagem.onerror = () => {
      URL.revokeObjectURL(url)
      rejeitar(new Error('Não foi possível ler a imagem. Verifique o ficheiro e tente novamente.'))
    }
    imagem.src = url
  })
}

export async function comprimirImagem(
  ficheiro: File,
  { larguraMaxima, qualidade }: OpcoesCompressao,
): Promise<ImagemComprimida> {
  const orientacao = ficheiro.type === 'image/jpeg' ? await lerOrientacaoExif(ficheiro) : 1
  const imagem = await carregarImagem(ficheiro)

  const rodado = dimensoesAposRotacao(imagem.naturalWidth, imagem.naturalHeight, orientacao)
  const escala = Math.min(1, larguraMaxima / rodado.largura)
  const larguraFinal = Math.round(rodado.largura * escala)
  const alturaFinal = Math.round(rodado.altura * escala)

  const canvas = document.createElement('canvas')
  canvas.width = larguraFinal
  canvas.height = alturaFinal
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('O navegador não permitiu processar a imagem.')

  contexto.save()
  const larguraDesenho = orientacao >= 5 && orientacao <= 8 ? alturaFinal : larguraFinal
  const alturaDesenho = orientacao >= 5 && orientacao <= 8 ? larguraFinal : alturaFinal
  aplicarOrientacao(contexto, orientacao, larguraFinal, alturaFinal)
  contexto.drawImage(imagem, 0, 0, larguraDesenho, alturaDesenho)
  contexto.restore()

  const blob = await new Promise<Blob | null>((resolver) =>
    canvas.toBlob(resolver, 'image/jpeg', qualidade),
  )
  if (!blob) throw new Error('Não foi possível comprimir a imagem.')

  const nome = ficheiro.name.replace(/\.[^.]+$/, '') || 'fotografia'
  return {
    ficheiro: new File([blob], `${nome}.jpg`, { type: 'image/jpeg' }),
    largura: larguraFinal,
    altura: alturaFinal,
  }
}

export const TIPOS_ACEITES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export function tipoAceite(ficheiro: File): boolean {
  return TIPOS_ACEITES.includes(ficheiro.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(ficheiro.name)
}
