// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://marcosarrieta.dev',
  // `json.stringify: false` keeps content.json tree-shakeable: stringified, it compiles
  // to one `JSON.parse` of the whole file, so a client script that imports a single key
  // — the console log — ships every string of both languages with it (5.9kB gz instead
  // of 0.8kB). As an object literal, Rollup drops what nobody imports.
  vite: { plugins: [tailwindcss()], json: { stringify: false } },
})
