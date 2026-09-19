/**
 * Espelha o projeto para uma pasta de trabalho local.
 *
 * Existe porque o Windows não executa binários nativos a partir de uma partilha de rede:
 * o Vite não arranca em Z:. O código continua a ser editado na partilha e isto traz as
 * alterações para a cópia local, onde o servidor corre e o HMR as apanha.
 *
 * Sondagem em vez de fs.watch: as notificações de alteração do Windows não são fiáveis
 * sobre SMB. São cerca de cem ficheiros, sondá-los não custa nada.
 */

import fs from 'node:fs'
import path from 'node:path'

/** Pastas espelhadas por inteiro, incluindo remoções. */
const PASTAS = ['src', 'public', 'scripts']

/** Ficheiros soltos na raiz. São copiados quando mudam, mas nunca removidos. */
const FICHEIROS = [
  'index.html',
  'vite.config.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'eslint.config.js',
  '.env.local',
]

const IGNORAR = new Set(['node_modules', 'dist', '.git', '.vite'])

function listar(raiz, relativo, acumulado) {
  const completo = path.join(raiz, relativo)
  let entradas
  try {
    entradas = fs.readdirSync(completo, { withFileTypes: true })
  } catch {
    return acumulado
  }

  for (const entrada of entradas) {
    if (IGNORAR.has(entrada.name)) continue
    const filho = relativo ? path.join(relativo, entrada.name) : entrada.name
    if (entrada.isDirectory()) {
      listar(raiz, filho, acumulado)
    } else if (entrada.isFile()) {
      try {
        const s = fs.statSync(path.join(raiz, filho))
        acumulado.set(filho.split(path.sep).join('/'), {
          mtime: Math.floor(s.mtimeMs),
          tamanho: s.size,
        })
      } catch {
        // O ficheiro desapareceu entre listar e medir. Aparece na passagem seguinte.
      }
    }
  }
  return acumulado
}

function inventario(origem) {
  const atual = new Map()
  for (const pasta of PASTAS) listar(origem, pasta, atual)
  for (const ficheiro of FICHEIROS) {
    try {
      const s = fs.statSync(path.join(origem, ficheiro))
      atual.set(ficheiro, { mtime: Math.floor(s.mtimeMs), tamanho: s.size })
    } catch {
      // Opcional: o .env.local pode não existir.
    }
  }
  return atual
}

function horas() {
  return new Date().toLocaleTimeString('pt-PT', { hour12: false })
}

function iguais(caminhoA, caminhoB) {
  try {
    const a = fs.statSync(caminhoA)
    const b = fs.statSync(caminhoB)
    if (a.size !== b.size) return false
    // Ficheiros de código, poucos KB: comparar o conteúdo é mais barato do que confiar
    // em datas que viajam mal entre SMB e NTFS.
    return fs.readFileSync(caminhoA).equals(fs.readFileSync(caminhoB))
  } catch {
    return false
  }
}

/**
 * Estado de partida: o que já está igual no destino conta como sincronizado.
 *
 * Sem isto, arrancar o espelho reescrevia os ficheiros todos. Um deles é o
 * package-lock.json, e reescrevê-lo debaixo de um Vite em execução matava-lhe o watcher
 * com EBUSY. Copiar só o que difere evita mexer no que ninguém precisa que mexa.
 */
export function estadoInicial(origem, destino) {
  const base = new Map()
  for (const [relativo, info] of inventario(origem)) {
    if (iguais(path.join(origem, relativo), path.join(destino, relativo))) {
      base.set(relativo, info)
    }
  }
  return base
}

/**
 * Onde ficam os ficheiros a meio de escrita.
 *
 * Tem de ser fora das pastas espelhadas: o Vite observa `public` e `src`, e um temporário
 * que aparece e desaparece ali rebenta-lhe o watcher com EBUSY. Fica na raiz do destino,
 * e o vite.config.ts manda ignorá-la.
 */
export const PASTA_TEMPORARIA = '.espelho-tmp'

/**
 * Copia um ficheiro, tolerando bloqueios momentâneos.
 *
 * O Vite lê os ficheiros ao mesmo tempo que nós escrevemos, e o Windows devolve EBUSY.
 * Três tentativas curtas resolvem o caso normal; se mesmo assim falhar, quem chama
 * trata de repetir na passagem seguinte.
 */
function copiarComTentativas(de, para, raizDestino, tentativas = 3) {
  const pastaTemp = path.join(raizDestino, PASTA_TEMPORARIA)

  for (let i = 1; ; i += 1) {
    const temporario = path.join(pastaTemp, `${process.pid}-${i}-${path.basename(para)}.tmp`)
    try {
      fs.mkdirSync(path.dirname(para), { recursive: true })
      fs.mkdirSync(pastaTemp, { recursive: true })
      // Escrever num temporário e só depois renomear. O destino nunca chega a existir
      // meio escrito, e o watcher do Vite não apanha um ficheiro aberto para escrita.
      fs.copyFileSync(de, temporario)
      fs.renameSync(temporario, para)
      return
    } catch (erro) {
      try {
        fs.rmSync(temporario, { force: true })
      } catch {
        // O temporário pode nem ter chegado a existir.
      }
      if (i >= tentativas) throw erro
      // Espera ativa e curta: são milissegundos, e evita tornar tudo assíncrono.
      const ate = Date.now() + 30
      while (Date.now() < ate) {
        /* aguarda */
      }
    }
  }
}

/**
 * Uma passagem de sincronização. Devolve o que mudou.
 * `anterior` é o inventário da passagem anterior, ou um Map vazio na primeira.
 */
export function sincronizar(origem, destino, anterior) {
  const atual = inventario(origem)
  const copiados = []
  const removidos = []
  const falhados = []

  for (const [relativo, info] of atual) {
    const antes = anterior.get(relativo)
    if (antes && antes.mtime === info.mtime && antes.tamanho === info.tamanho) continue
    try {
      copiarComTentativas(path.join(origem, relativo), path.join(destino, relativo), destino)
      copiados.push(relativo)
    } catch (erro) {
      // Não marcar como sincronizado: sem isto, uma cópia falhada deixava a cópia local
      // desatualizada em silêncio até o ficheiro voltar a mudar na origem.
      atual.delete(relativo)
      falhados.push(`${relativo}: ${erro.code || erro.message}`)
    }
  }

  // Remoções apenas dentro das pastas espelhadas, para nunca apagar node_modules
  // nem dist na cópia local.
  //
  // Percorre o destino, não a passagem anterior: um ficheiro apagado na origem enquanto o
  // espelho estava parado nunca chegou a entrar no inventário e ficava para sempre na cópia
  // local. Foi assim que os logótipos apagados continuaram a ser servidos, escondendo que
  // o site já não os tinha.
  const noDestino = new Map()
  for (const pasta of PASTAS) listar(destino, pasta, noDestino)

  for (const relativo of noDestino.keys()) {
    if (atual.has(relativo)) continue
    try {
      fs.rmSync(path.join(destino, relativo), { force: true })
      removidos.push(relativo)
    } catch {
      // Já não existia.
    }
  }

  return { inventario: atual, copiados, removidos, falhados }
}

/** Uma única passagem, silenciosa exceto no resumo. Usada antes de builds. */
export function espelharUmaVez(origem, destino) {
  const { copiados } = sincronizar(origem, destino, estadoInicial(origem, destino))
  return copiados.length
}

/** Sondagem contínua. Devolve uma função para parar. */
export function espelharEmContinuo(origem, destino, intervaloMs = 400) {
  let anterior = estadoInicial(origem, destino)
  let primeira = true

  const passagem = () => {
    const r = sincronizar(origem, destino, anterior)
    anterior = r.inventario
    if (primeira) {
      console.log(`${horas()}  espelho pronto: ${r.copiados.length} ficheiros`)
      primeira = false
      return
    }
    for (const f of r.copiados) console.log(`${horas()}  ↻ ${f}`)
    for (const f of r.removidos) console.log(`${horas()}  ✕ ${f}`)
    for (const f of r.falhados) console.log(`${horas()}  ↺ bloqueado, a repetir: ${f}`)
  }

  passagem()
  const temporizador = setInterval(passagem, intervaloMs)
  return () => clearInterval(temporizador)
}
