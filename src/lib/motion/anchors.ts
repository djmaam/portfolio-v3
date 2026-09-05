import { anchorOffset } from './math'
import { prefersReducedMotion } from './reduced'

/**
 * The site's only anchor click handler, delegated on `document`: every `[data-nav-link]`
 * — the nav links and the hero CTAs — scrolls through here, so the nav offset, the `#top`
 * case and the reduced-motion fallback exist exactly once. Called once from `Base.astro`.
 */
export function bindAnchors(): void {
  // One number for the sticky height and the scroll offset: app.css owns it.
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'))

  document.addEventListener('click', (event) => {
    const source = event.target
    const link =
      source instanceof Element ? source.closest<HTMLAnchorElement>('a[data-nav-link]') : null
    if (!link) return

    const hash = link.getAttribute('href') ?? ''
    const target = hash === '#top' ? null : document.getElementById(hash.slice(1))
    // The sections land in issues 06-13. Until then the link falls back to the browser,
    // which does nothing with a fragment it cannot resolve.
    if (hash !== '#top' && !target) return

    event.preventDefault()
    const top = target ? target.getBoundingClientRect().top + window.scrollY : 0
    window.scrollTo({
      top: anchorOffset(top, navH),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  })
}
