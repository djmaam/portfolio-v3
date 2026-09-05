// Single source of content: `handoff/content.json` is read-only and must not be
// duplicated, so the import deliberately crosses out of `src/`. Astro inlines it at
// build time, so `dist/` ships no JSON of its own.
import raw from '../../handoff/content.json'

export type Lang = 'es' | 'en'

/** Derived from the JSON on purpose: a new key in content.json needs no type edit. */
export type Content = (typeof raw)['i18n']['es']

export const LANGS = ['es', 'en'] as const satisfies readonly Lang[]

export const content: Record<Lang, Content> = raw.i18n
export const { links, stack, consoleLog } = raw
