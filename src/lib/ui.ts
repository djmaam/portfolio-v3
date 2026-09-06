import type { Lang } from './content'

/**
 * Labels for interface chrome that has no visible text: `handoff/content.json` is
 * read-only and holds page copy only, so accessible names for controls live here. Same
 * rationale as `site` in `content.ts` — this is UI, not content.
 */
export const ui: Record<Lang, { themeToggle: string; skipToContent: string }> = {
  es: { themeToggle: 'Cambiar el tema', skipToContent: 'Saltar al contenido' },
  en: { themeToggle: 'Toggle the theme', skipToContent: 'Skip to content' },
}

/**
 * The hero stats. Language-independent facts, absent from the read-only `content.json`,
 * which pairs each number with its label. `companies` is asserted against
 * `content.jobs.length` in the tests; `years` and `platforms` are editorial and have no
 * derivable source.
 */
export const stats = { years: '8+', companies: '5', platforms: '6' } as const

/**
 * The console's chrome (`DESIGN_SPEC` §3.2). Not page copy and not translated: a session
 * label, a status word and three metric names that read the same in both languages —
 * only the log lines themselves are content, and those live in `content.json`. The keys
 * match the fields of `metricsAt`, which is what the footer renders.
 */
export const consoleChrome = {
  session: 'orchestrator — session 0x4D41',
  live: 'LIVE',
  metrics: [
    { key: 'agents', label: 'AGENTS' },
    { key: 'specs', label: 'SPECS' },
    { key: 'shipped', label: 'SHIPPED' },
  ],
} as const

/**
 * The companies behind the "also with" box of the experience timeline. They live in the
 * mock (`handoff/reference/Portfolio.dc.html:697`) but never made it into
 * `content.json`, which only carries the label. Proper nouns, identical in both
 * languages, so they belong here next to the other chrome that is not translated copy.
 */
export const alsoWithCompanies = ['Creativa Media Lab', 'Kodai', 'Hashme', 'Demedis'] as const
