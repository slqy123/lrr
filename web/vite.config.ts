import tailwindcss from '@tailwindcss/vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:29481',
      '/add': 'http://127.0.0.1:29481',
      '/status': 'http://127.0.0.1:29481',
    },
  },
})
