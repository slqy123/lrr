import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const preview = mode === 'preview'
  return {
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    plugins: [tailwindcss(), {
      name: 'publish-userscript',
      closeBundle() {
        if (preview) {
          copyFileSync(new URL('../userscript/preview.html', import.meta.url), new URL('../userscript/dist/preview.html', import.meta.url))
          return
        }
        copyFileSync(
          new URL('../userscript/dist/lanraragi-checker.user.js', import.meta.url),
          new URL('../lanraragi-checker.user.js', import.meta.url),
        )
      },
    }],
    resolve: { dedupe: ['react', 'react-dom'] },
    build: {
      assetsInlineLimit: () => true,
      emptyOutDir: false,
      outDir: fileURLToPath(new URL('../userscript/dist', import.meta.url)),
      minify: false,
      lib: {
        entry: fileURLToPath(new URL(preview ? './src/preview/preview.tsx' : './src/userscript/main.tsx', import.meta.url)),
        name: 'LrrChecker',
        formats: ['iife'],
        fileName: () => preview ? 'preview.js' : 'lanraragi-checker.user.js',
      },
      rollupOptions: {
        output: { banner: preview ? '' : readFileSync(new URL('../userscript/header.txt', import.meta.url), 'utf8') },
      },
    },
  }
})
