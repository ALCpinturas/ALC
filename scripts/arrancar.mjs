/**
 * Lançador único do projeto ALC.
 *
 *   node scripts/arrancar.mjs              servidor de desenvolvimento
 *   node scripts/arrancar.mjs build        verificação completa e build de produção
 *   node scripts/arrancar.mjs verificar    typecheck, lint e testes
 *   node scripts/arrancar.mjs previsualizar  serve o build já feito
 *
 * Quando o projeto está numa partilha de rede, o Windows recusa executar os binários
 * nativos do Vite a partir dela. Nesse caso este script prepara uma cópia local, mantém-na
 * espelhada e corre tudo lá, sem ser preciso pensar nisso. Num disco local corre no sítio,
 * sem cópia nenhuma.
 */

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { espelharEmContinuo, espelharUmaVez } from './espelho.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PASTA_LOCAL = process.env.ALC_PASTA_LOCAL || path.join(os.homedir(), 'alc-dev')
const PORTA = process.env.ALC_PORTA || '5173'

const cor = {
  titulo: (t) => `\x1b[1m${t}\x1b[0m`,
  suave: (t) => `\x1b[2m${t}\x1b[0m`,
  erro: (t) => `\x1b[31m${t}\x1b[0m`,
  bom: (t) => `\x1b[32m${t}\x1b[0m`,
}

/**
 * O projeto consegue executar os binários daqui?
 *
 * Testa a sério em vez de adivinhar: corre o esbuild instalado. Numa partilha de rede o
 * Windows devolve acesso negado, e é esse o sinal de que precisamos de uma cópia local.
 */
function executaBinariosAqui() {
  const esbuild = path.join(RAIZ, 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe')
  if (fs.existsSync(esbuild)) {
    const r = spawnSync(esbuild, ['--version'], { encoding: 'utf8' })
    return r.status === 0
  }

  // Sem node_modules ainda: decide pelo tipo de unidade.
  const raizUnidade = path.parse(RAIZ).root
  if (raizUnidade.startsWith('\\\\')) return false
  const r = spawnSync(
    'powershell',
    ['-NoProfile', '-Command', `[System.IO.DriveInfo]::new('${raizUnidade}').DriveType`],
    { encoding: 'utf8' },
  )
  return !String(r.stdout || '').trim().startsWith('Network')
}

/**
 * No Windows, npm e npx são ficheiros batch, que o CreateProcess não executa diretamente.
 * Passam pelo cmd.exe com os argumentos separados — sem `shell: true`, que o Node
 * desaconselha por concatenar sem escapar.
 */
function invocacao(comando, argumentos) {
  if (process.platform === 'win32') {
    return ['cmd.exe', ['/d', '/s', '/c', comando, ...argumentos]]
  }
  return [comando, argumentos]
}

function correr(comando, argumentos, opcoes = {}) {
  const [executavel, lista] = invocacao(comando, argumentos)
  const r = spawnSync(executavel, lista, { stdio: 'inherit', ...opcoes })
  if (r.error) {
    console.error(cor.erro(`Não foi possível correr ${comando}: ${r.error.message}`))
    return 1
  }
  return r.status ?? 1
}

/** Prepara a cópia local: ficheiros espelhados e dependências instaladas. */
function prepararCopiaLocal() {
  fs.mkdirSync(PASTA_LOCAL, { recursive: true })
  const copiados = espelharUmaVez(RAIZ, PASTA_LOCAL)
  console.log(cor.suave(`Espelho para ${PASTA_LOCAL}: ${copiados} ficheiros.`))

  const marcaFicheiro = path.join(PASTA_LOCAL, 'node_modules', '.alc-instalado')
  const pacote = fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')
  const marcaAtual = String(pacote.length)
  const jaInstalado =
    fs.existsSync(marcaFicheiro) && fs.readFileSync(marcaFicheiro, 'utf8') === marcaAtual

  if (!jaInstalado) {
    console.log(cor.suave('A instalar dependências na cópia local (só desta vez)...'))
    const estado = correr('npm', ['install', '--no-audit', '--no-fund'], { cwd: PASTA_LOCAL })
    if (estado !== 0) {
      console.error(cor.erro('A instalação falhou.'))
      process.exit(estado)
    }
    fs.mkdirSync(path.dirname(marcaFicheiro), { recursive: true })
    fs.writeFileSync(marcaFicheiro, marcaAtual)
  }

  return PASTA_LOCAL
}

/** Onde os comandos correm, e se é preciso manter o espelho vivo. */
function preparar() {
  if (executaBinariosAqui()) {
    console.log(cor.suave('A correr no sítio: esta pasta executa os binários.'))
    return { pasta: RAIZ, espelhar: false }
  }
  console.log(
    cor.suave('Esta pasta não executa binários nativos. A usar uma cópia local de trabalho.'),
  )
  return { pasta: prepararCopiaLocal(), espelhar: true }
}

function desenvolvimento() {
  const { pasta, espelhar } = preparar()
  let pararEspelho = () => {}

  if (espelhar) {
    console.log(cor.titulo(`\nEspelho ${RAIZ} → ${pasta}`))
    console.log(cor.suave('Edite sempre na pasta original. A cópia local é descartável.\n'))
    pararEspelho = espelharEmContinuo(RAIZ, pasta)
  }

  const [executavel, argumentos] = invocacao('npx', [
    'vite',
    '--host',
    '127.0.0.1',
    '--port',
    PORTA,
    '--strictPort',
  ])
  const vite = spawn(executavel, argumentos, { cwd: pasta, stdio: 'inherit' })

  const terminar = () => {
    pararEspelho()
    vite.kill()
    process.exit(0)
  }
  process.on('SIGINT', terminar)
  process.on('SIGTERM', terminar)

  vite.on('exit', (codigo) => {
    pararEspelho()
    process.exit(codigo ?? 0)
  })
}

function verificar(pasta) {
  const etapas = [
    ['Typecheck', 'npx', ['tsc', '--noEmit', '-p', 'tsconfig.app.json']],
    ['Lint', 'npx', ['eslint', '.']],
    ['Testes', 'npx', ['vitest', 'run']],
  ]

  for (const [nome, comando, argumentos] of etapas) {
    console.log(cor.titulo(`\n${nome}`))
    const estado = correr(comando, argumentos, { cwd: pasta })
    if (estado !== 0) {
      console.error(cor.erro(`\n${nome} falhou. Build interrompido.`))
      process.exit(estado)
    }
  }
}

function build() {
  const { pasta } = preparar()
  verificar(pasta)

  console.log(cor.titulo('\nBuild'))
  const estado = correr('npx', ['vite', 'build'], { cwd: pasta })
  if (estado !== 0) process.exit(estado)

  // O resultado volta para junto do projeto, para não ficar preso na cópia local.
  if (pasta !== RAIZ) {
    const origem = path.join(pasta, 'dist')
    const destino = path.join(RAIZ, 'dist')
    fs.rmSync(destino, { recursive: true, force: true })
    fs.cpSync(origem, destino, { recursive: true })
    console.log(cor.suave(`\ndist copiado para ${destino}`))
  }

  console.log(cor.bom('\nBuild concluído.'))
}

function previsualizar() {
  const { pasta } = preparar()
  console.log(cor.titulo('\nPré-visualização do build'))
  correr('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', PORTA], { cwd: pasta })
}

const comando = process.argv[2] || 'dev'

switch (comando) {
  case 'dev':
    desenvolvimento()
    break
  case 'build':
    build()
    break
  case 'verificar':
    verificar(preparar().pasta)
    console.log(cor.bom('\nTudo verificado.'))
    break
  case 'previsualizar':
    previsualizar()
    break
  default:
    console.error(`Comando desconhecido: ${comando}`)
    console.error('Use: dev | build | verificar | previsualizar')
    process.exit(1)
}
