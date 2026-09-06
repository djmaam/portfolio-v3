// How each project is previewed. Declarative and keyed by **host**, never by position
// in `content.json`: reordering the list must not put a live iframe on a site that
// answers `X-Frame-Options: DENY`, which is exactly what an index-keyed table would do.
// Header check run on 2026-09-05 (design doc §8).

export type PreviewMode = 'iframe' | 'screenshot'

export const PREVIEWS: Record<string, PreviewMode> = {
  'nera-agro.com': 'iframe',
  'agropro.ag': 'iframe',
  'kodaiverse.com': 'iframe',
  'masushuaia.com': 'iframe',
  // `X-Frame-Options: DENY` + `frame-ancestors 'none'`.
  'creativamedialab.com': 'screenshot',
  // Does not answer `curl` at all (WAF).
  'telecentro.com.ar': 'screenshot',
}

/**
 * A host nobody declared falls back to a screenshot: an undeclared site may well refuse
 * to be framed, and a placeholder is a far cheaper mistake than an empty iframe. The
 * unit test is what keeps a new project in `content.json` from staying undeclared.
 */
export function previewMode(host: string): PreviewMode {
  return PREVIEWS[host] ?? 'screenshot'
}

/**
 * Reveal stagger of the projects grid (`MOTION_SPEC` §9): 90ms per column, restarting
 * on every row, so a card is never held back by the rows above it. Three columns is the
 * widest the grid ever gets at `minmax(min(100%, 300px), 1fr)` inside `container-page`.
 */
export function projectDelay(index: number): number {
  return 90 * (index % 3)
}
