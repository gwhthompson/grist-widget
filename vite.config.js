import { defineConfig } from 'vite'
import { glob } from 'glob'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(async () => ({
  plugins: [
    tailwindcss()
  ],
  build: {
    rollupOptions: {
      input: await glob('./*/index.html')
    }
  },
  server: { port: 8585, allowedHosts: ['.localhost', '.gristwidget.test'] }
}))
