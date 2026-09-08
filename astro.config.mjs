// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  output: 'static',
  // The inline theme script and the JSON-LD block are hashed by Astro at build time and
  // written into a `<meta http-equiv>`, so the policy never drifts from the output the
  // way a hand-maintained hash in `_headers` would. `frame-ancestors` is the one
  // directive a meta policy cannot express — `X-Frame-Options` in `public/_headers`
  // covers that need instead.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        // Where the Web Analytics beacon reports to. The host it is *served* from is a
        // `script-src` source, and Astro owns that directive — see `scriptDirective`.
        "connect-src 'self' https://cloudflareinsights.com",
        "img-src 'self' data:",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ],
      // Astro appends the inline script hashes to whatever sources are listed here, so
      // naming the beacon's host keeps hashing intact — which is precisely what hand-
      // installing the snippet buys over letting Cloudflare inject it.
      scriptDirective: { resources: ["'self'", 'https://static.cloudflareinsights.com'] },
      styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
    },
  },
  // `/en` and not `/en/`. The default writes `en/index.html`, which Cloudflare Pages
  // serves at `/en/` and reaches from `/en` with a 308 — so the canonical, both hreflang
  // alternates and the sitemap, all of which say `/en`, pointed at a redirect. `file`
  // emits `en.html`, which Pages serves at `/en` directly.
  build: { format: 'file' },
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
