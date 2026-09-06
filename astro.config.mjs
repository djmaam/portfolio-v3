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
  // `strictPort`: `astro preview` otherwise walks forward to the next free port, which is
  // silent and fine for a human and wrong for Playwright — it waits on the port it asked
  // for and times out after 60s with nothing to read. Erroring on a busy port is what
  // makes several worktrees able to run the suite at the same time.
  vite: {
    plugins: [tailwindcss()],
    json: { stringify: false },
    preview: { strictPort: true },
  },
})
