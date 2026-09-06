import { prefersReducedMotion } from './reduced'

/**
 * The site's only `IntersectionObserver` (`MOTION_SPEC` §5): every `[data-reveal]` under
 * `root` starts hidden — an `app.css` rule that only applies under `html.has-js` and
 * `no-preference` — and is revealed the first time it enters the viewport, staggered by
 * its own `data-delay` in ms. Each element is unobserved as it fires, so it animates
 * once and the observer empties as the page is read.
 *
 * Called once from `Base.astro`, like `bindAnchors`; the returned function disconnects.
 * With `prefers-reduced-motion: reduce` nothing is observed and the elements keep the
 * resting state the CSS never took away from them.
 */
export function bindReveals(root: ParentNode = document): () => void {
  if (prefersReducedMotion()) return () => {}

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const element = entry.target as HTMLElement
        observer.unobserve(element)
        element.style.transitionDelay = `${Number(element.dataset.delay ?? 0)}ms`
        element.style.opacity = '1'
        element.style.transform = 'none'
        element.style.filter = 'none'
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  )

  for (const element of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
    observer.observe(element)
  }

  return () => observer.disconnect()
}
