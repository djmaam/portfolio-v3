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
