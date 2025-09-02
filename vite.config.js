import { defineConfig } from 'vite'
import { glob } from 'glob'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Plugin to generate widgets.json and manifest.yml
const generateManifest = () => ({
  name: 'generate-manifest',
  writeBundle: async () => {
    const htmlFiles = await glob('./*/index.html')
    const widgets = htmlFiles.map(file => {
      const dir = path.dirname(file).replace('./', '')
      const name = dir.charAt(0).toUpperCase() + dir.slice(1)
      return {
        name,
        url: dir,
        widgetId: `gwhthompson/widget-${dir}`
      }
    })
    
    // Write widgets.json
    fs.writeFileSync(
      path.join('dist', 'widgets.json'),
      JSON.stringify(widgets, null, 2)
    )
    
    // Write manifest.yml
    fs.writeFileSync(
      path.join('dist', 'manifest.yml'),
      'name: Widgets\ncomponents:\n  widgets: widgets.json\n'
    )
  }
})

export default defineConfig(async () => ({
  base: './',
  plugins: [tailwindcss(), generateManifest()],
  build: {
    rollupOptions: {
      input: await glob('./*/index.html')
    }
  },
  server: { port: 8585, allowedHosts: ['.localhost', '.gristwidget.test'] }
}))
