import type { APIRoute } from 'astro'

import { LANGS, links } from '../lib/content'

// Two routes and no plans for a third, so `@astrojs/sitemap` would be a dependency to
// render six lines. The `hreflang` alternates mirror the `<link rel="alternate">` pairs
// in `Base.astro`: every URL declares both languages, plus `x-default` on Spanish.
const href = (lang: string) => `${links.domain}${lang === 'es' ? '/' : `/${lang}`}`

const alternates = [
  ...LANGS.map((lang) => ({ hreflang: lang, href: href(lang) })),
  { hreflang: 'x-default', href: href('es') },
]

export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map(
  (lang) => `  <url>
    <loc>${href(lang)}</loc>
${alternates.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`).join('\n')}
  </url>`,
).join('\n')}
</urlset>
`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  )
