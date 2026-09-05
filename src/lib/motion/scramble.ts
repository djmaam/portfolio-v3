import { scrambleFrame } from './math'
import { prefersReducedMotion } from './reduced'

/**
 * Runs `scrambleFrame` over `duration` on an element's `textContent`. The resolved text is
 * cached on the element the first time, so a run that starts while another is in flight
 * (the brand's interval against a hover) still resolves to the real string instead of
 * freezing a half-scrambled frame.
 *
 * Shared by the nav brand and the company names of the experience timeline — the timing
 * lives here, the maths in `math.ts`, and neither is copied anywhere else.
 */
export function scramble(el: HTMLElement, duration: number): void {
  if (prefersReducedMotion()) return

  const target = (el.dataset.scramble ??= el.textContent ?? '')
  let start: number | undefined

  // The first frame's timestamp is the start: no clock is read outside the frame loop.
  const step = (now: number) => {
    start ??= now
    const p = duration > 0 ? Math.min(1, (now - start) / duration) : 1
    el.textContent = scrambleFrame(target, p)
    if (p < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}
