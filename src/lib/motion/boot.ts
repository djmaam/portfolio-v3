import { ENTRY_MS, ENTRY_REVEAL, entryDelay } from './entry'
import { prefersReducedMotion } from './reduced'

/**
 * The content cascade, the last phase of the entry choreography (spec 31): every
 * `[data-boot="n"]` starts hidden — an `app.css` rule that only applies under
 * `html.has-js` and `no-preference` — and is revealed at `entryDelay(n)`.
 *
 * The final state is applied on the first frame, with no transition, in the two cases
 * where nothing should animate: `prefers-reduced-motion: reduce`, and an entry that has
 * already run once this session (`entryDriver.ts` writes `data-entry="done"` before this
 * is called, so navigating between `/` and `/en` does not replay the cascade).
 *
 * Plumbing only: the timing is `entryDelay`, which the unit tests cover.
 */
export function boot(): void {
  const elements = [...document.querySelectorAll<HTMLElement>('[data-boot]')].sort(
    (a, b) => Number(a.dataset.boot) - Number(b.dataset.boot),
  )

  const done = prefersReducedMotion() || document.documentElement.dataset.entry === 'done'

  const show = (element: HTMLElement) => {
    element.style.opacity = '1'
    element.style.transform = 'none'
    element.style.filter = 'none'
  }

  for (const element of elements) {
    if (done) {
      show(element)
      continue
    }
    // The reveal retimes with the sequence like every other span, instead of holding the
    // 900ms of the stylesheet and finishing after the entry has been torn down.
    element.style.transitionDuration = `${ENTRY_REVEAL * ENTRY_MS}ms`
    setTimeout(() => show(element), entryDelay(Number(element.dataset.boot), ENTRY_MS))
  }
}
