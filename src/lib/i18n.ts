import type { Lang } from './content'

export const DEFAULT_LANG: Lang = 'es'

/** Every language but the default one lives under its own path prefix. */
const PREFIX = /^\/en(?=\/|$)/

/** `/en` and `/en/…` are English; anything else falls back to the default language. */
export function langFromPath(pathname: string): Lang {
  return PREFIX.test(pathname) ? 'en' : DEFAULT_LANG
}

/** The same page in language `to`: `/` ⇄ `/en`. Tolerates a trailing slash. */
export function siblingPath(pathname: string, to: Lang): string {
  const rest = pathname.replace(PREFIX, '').replace(/\/$/, '')
  return to === DEFAULT_LANG ? rest || '/' : `/en${rest}`
}
