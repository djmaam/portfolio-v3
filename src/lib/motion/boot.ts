import { ENTRY_MS, ENTRY_REVEAL, entryDelay } from './entry'
import { prefersReducedMotion } from './reduced'

function show(element: HTMLElement): void {
  element.style.opacity = '1'
  element.style.transform = 'none'
  element.style.filter = 'none'
}

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

  for (const element of elements) {
    if (done) {
      // On the first frame and with no transition: `reduce` never asked for one, and a
      // second load in the same session has already watched the cascade once.
      element.style.transition = 'none'
      show(element)
      continue
    }
    // The reveal retimes with the sequence like every other span, instead of holding the
    // 900ms of the stylesheet and finishing after the entry has been torn down.
    element.style.transitionDuration = `${ENTRY_REVEAL * ENTRY_MS}ms`
    setTimeout(() => show(element), entryDelay(Number(element.dataset.boot), ENTRY_MS))
  }
}

/**
 * Brings the whole cascade in at once, on the transition the elements already carry. The
 * entry calls this when it is skipped: the timers it set are still pending, and a visitor
 * who clicked through the sequence should not have to wait for them.
 */
export function revealBoot(): void {
  for (const element of document.querySelectorAll<HTMLElement>('[data-boot]')) show(element)
}
