import type { Lang } from './content'

/**
 * Labels for interface chrome that has no visible text: `handoff/content.json` is
 * read-only and holds page copy only, so accessible names for controls live here. Same
 * rationale as `site` in `content.ts` — this is UI, not content.
 */
export const ui: Record<Lang, { themeToggle: string }> = {
  es: { themeToggle: 'Cambiar el tema' },
  en: { themeToggle: 'Toggle the theme' },
}

/**
 * The hero stats. Language-independent facts, absent from the read-only `content.json`,
 * which pairs each number with its label. `companies` is asserted against
 * `content.jobs.length` in the tests; `years` and `platforms` are editorial and have no
 * derivable source.
 */
export const stats = { years: '8+', companies: '5', platforms: '6' } as const
