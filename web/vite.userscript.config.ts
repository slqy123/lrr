import { defineConfig } from 'vite'
import { copyFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [{
    name: 'publish-userscript',
    closeBundle() {
      copyFileSync(
        new URL('../userscript/dist/lanraragi-checker.user.js', import.meta.url),
        new URL('../lanraragi-checker.user.js', import.meta.url),
      )
    },
  }],
  build: {
    emptyOutDir: true,
    outDir: fileURLToPath(new URL('../userscript/dist', import.meta.url)),
    minify: false,
    lib: {
      entry: fileURLToPath(new URL('../userscript/src/checker.js', import.meta.url)),
      name: 'LrrChecker',
      formats: ['iife'],
      fileName: () => 'lanraragi-checker.user.js',
    },
    rollupOptions: {
      output: { banner: readFileSync(new URL('../userscript/header.txt', import.meta.url), 'utf8') },
    },
  },
})
