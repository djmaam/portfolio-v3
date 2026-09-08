import type { Lang } from './content'

export const DEFAULT_LANG: Lang = 'es'

/** Every language but the default one lives under its own path prefix. */
const PREFIX = /^\/en(?=\/|$)/

/** `/en` and `/en/…` are English; anything else falls back to the default language. */
export function langFromPath(pathname: string): Lang {
  return PREFIX.test(pathname) ? 'en' : DEFAULT_LANG
}

/**
 * The file `build.format: 'file'` writes for a route, as it appears in `Astro.url`:
 * `/` builds `index.html` and reports `/index.html`, `/en` builds `en.html` and reports
 * `/en/en.html`. Both callers pass `Astro.url.pathname`, so the route has to come back
 * out of it here — otherwise the canonical of `/en` reads `/en/en.html`.
 */
const BUILT_FILE = /\/[^/]*\.html$/

/** The same page in language `to`: `/` ⇄ `/en`. Tolerates a trailing slash. */
export function siblingPath(pathname: string, to: Lang): string {
  const rest = pathname.replace(BUILT_FILE, '').replace(PREFIX, '').replace(/\/$/, '')
  return to === DEFAULT_LANG ? rest || '/' : `/en${rest}`
}
