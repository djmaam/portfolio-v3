/**
 * The JS half of the `prefers-reduced-motion` guard; the CSS half is the
 * `@media (prefers-reduced-motion: no-preference)` blocks in `app.css`. Every motion
 * module checks this before it animates anything.
 */
export function prefersReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}
