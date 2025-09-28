import { defineConfig } from 'vite'
import { glob } from 'glob'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import yaml from 'js-yaml'

// Plugin to generate widgets.json and manifest.yml
const generateManifest = () => ({
  name: 'generate-manifest',
  writeBundle: async () => {
    const htmlFiles = await glob('./widgets/*/index.html')
    const widgets = htmlFiles.map(file => {
      const dir = path.basename(path.dirname(file))
      const name = dir.charAt(0).toUpperCase() + dir.slice(1)
      
      // Try to read optional widget.yml or config.yml file
      let yamlData = {}
      const possibleYamlFiles = [
        path.join('widgets', dir, 'widget.yml'),
        path.join('widgets', dir, 'config.yml'),
        path.join('widgets', dir, `${dir}.yml`)
      ]
      
      for (const yamlFile of possibleYamlFiles) {
        if (fs.existsSync(yamlFile)) {
          try {
            const yamlContent = fs.readFileSync(yamlFile, 'utf8')
            yamlData = yaml.load(yamlContent) || {}
            break
          } catch (error) {
            console.warn(`Warning: Could not parse YAML file ${yamlFile}:`, error.message)
          }
        }
      }
      
      // Default widget properties
      const defaultWidget = {
        name,
        url: `./dist/${dir}/index.html`,
        widgetId: `gwhthompson/widget-${dir}`,
        authors: [
          {
            name: "George Thompson",
            url: "https://github.com/gwhthompson"
          }
        ],
        lastUpdatedAt: new Date().toISOString()
      }
      
      // Merge YAML data with defaults (YAML data takes precedence)
      return { ...defaultWidget, ...yamlData }
    })
    
    // Create widgets directory structure
    const widgetsDir = path.join('dist', 'widgets')
    const widgetsDistDir = path.join(widgetsDir, 'dist')
    
    if (!fs.existsSync(widgetsDir)) {
      fs.mkdirSync(widgetsDir, { recursive: true })
    }
    if (!fs.existsSync(widgetsDistDir)) {
      fs.mkdirSync(widgetsDistDir, { recursive: true })
    }
    
    // Move assets directory to widgets/dist/
    const assetsPath = path.join('dist', 'assets')
    const newAssetsPath = path.join(widgetsDistDir, 'assets')
    if (fs.existsSync(assetsPath)) {
      fs.renameSync(assetsPath, newAssetsPath)
    }
    
    // Move widget directories to widgets/dist/
    for (const file of htmlFiles) {
      const dir = path.basename(path.dirname(file))
      const oldPath = path.join('dist', 'widgets', dir)
      const newPath = path.join(widgetsDistDir, dir)
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath)
      }
    }
    
    // Write widgets.json
    fs.writeFileSync(
      path.join(widgetsDir, 'widgets.json'),
      JSON.stringify(widgets, null, 2)
    )
    
    // Write manifest.yml
    fs.writeFileSync(
      path.join('dist', 'manifest.yml'),
      'name: Widgets\ncomponents:\n  widgets: widgets/widgets.json\n'
    )
  }
})

export default defineConfig(async () => ({
  base: './',
  plugins: [tailwindcss(), generateManifest()],
  build: {
    rollupOptions: {
      input: await glob('./widgets/*/index.html')
    }
  },
  server: { port: 8585, allowedHosts: ['.localhost', '.gristwidget.test'] }
}))
