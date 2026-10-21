import type { APIRoute } from 'astro'

import { links } from '../../lib/content'

// RFC 9116. An endpoint for the same reason as `robots.txt`: the domain and the address
// are already written down once, in `content.json`. `Expires` is required and must sit
// within a year, so it is computed from the build — every deploy pushes it forward.
// ponytail: a year with no deploy lets it lapse; pin a date in content.json if that happens.
export const GET: APIRoute = () => {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  return new Response(
    [
      `Contact: mailto:${links.email}`,
      `Expires: ${expires.toISOString()}`,
      'Preferred-Languages: es, en',
      `Canonical: ${links.domain}/.well-known/security.txt`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
}
