import type { APIRoute } from 'astro'

import { links } from '../lib/content'

// An endpoint rather than a file in `public/`, for the same reason the sitemap is one:
// the domain is already written down once, in `content.json`.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${links.domain}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
