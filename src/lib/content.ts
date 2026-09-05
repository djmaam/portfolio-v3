// Single source of content: `handoff/content.json` is read-only and must not be
// duplicated, so the import deliberately crosses out of `src/`. Astro inlines it at
// build time, so `dist/` ships no JSON of its own.
//
// Named imports, not a default one: they are what lets Rollup drop the keys a client
// script does not use (see `json.stringify` in astro.config.mjs).
import { consoleLog, i18n, links, stack } from '../../handoff/content.json'

export type Lang = 'es' | 'en'

/** Derived from the JSON on purpose: a new key in content.json needs no type edit. */
export type Content = (typeof i18n)['es']

export const LANGS = ['es', 'en'] as const satisfies readonly Lang[]

/**
 * Identity, not copy: the same in both languages and absent from content.json, which
 * only holds translatable strings. Nav, footer, and <title> all read it from here so
 * the name still lives in exactly one place.
 */
export const site = { name: 'Marcos Arrieta', handle: '@djmaam' } as const

export const content: Record<Lang, Content> = i18n
export { consoleLog, links, stack }
