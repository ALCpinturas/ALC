import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * O watcher do Vite emite 'error' e, sem ninguém a ouvir, o Node derruba o processo.
 *
 * No Windows isso acontece sempre que um ficheiro é criado, substituído ou removido por
 * fora enquanto o servidor corre — copiar imagens para public/ bastava para matar o
 * servidor com EBUSY. Registar o erro e continuar é o comportamento certo: uma falha a
 * observar um ficheiro não é motivo para perder o servidor de desenvolvimento.
 */
function watcherTolerante(): Plugin {
  return {
    name: 'alc-watcher-tolerante',
    apply: 'serve',
    configureServer(servidor) {
      servidor.watcher.on('error', (erro: NodeJS.ErrnoException) => {
        servidor.config.logger.warn(
          `[watcher] ignorado: ${erro.code ?? ''} ${erro.path ?? erro.message}`,
        )
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), watcherTolerante()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    watch: {
      // Ficheiros a meio de escrita do espelho (scripts/espelho.mjs). Sem isto o watcher
      // tenta observar um temporário que já foi renomeado e o servidor morre com EBUSY.
      ignored: ['**/.espelho-tmp/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
