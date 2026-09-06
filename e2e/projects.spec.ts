import { expect, test } from '@playwright/test'

/**
 * The projects section (block 24). The unit tests in `tests/projects.test.ts` cover the
 * source and the CSS text; what a layout engine has to confirm is the thing text cannot
 * prove — the shimmer's actual rendered bounding box at both ends of its loop, and the
 * anchor's resolved `href` after Astro has rendered it.
 */

const ROUTES = ['/', '/en']

test.describe('the shimmer loop has no visible cut at either endpoint', () => {
  for (const route of ROUTES) {
    test(`${route}: the band never overlaps the frame at 0% or 100%`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.goto(route)

      const frame = page.locator('.preview').first()
      const shimmer = frame.locator('.shimmer')

      const frameBox = await frame.boundingBox()
      if (!frameBox) throw new Error('no .preview on the page')

      // Sampling the two keyframe endpoints directly, instead of timing the real
      // animation, is what makes this deterministic (PV3-29 asks for "asserted", not
      // "eyeballed").
      for (const transform of [
        'translateX(-120%) skewX(-12deg)',
        'translateX(270%) skewX(-12deg)',
      ]) {
        await shimmer.evaluate((el, value) => {
          ;(el as HTMLElement).style.animation = 'none'
          ;(el as HTMLElement).style.transform = value
        }, transform)

        const box = await shimmer.boundingBox()
        if (!box) throw new Error('no .shimmer on the page')

        const clearOfLeft = box.x + box.width <= frameBox.x + 0.5
        const clearOfRight = box.x >= frameBox.x + frameBox.width - 0.5
        expect(clearOfLeft || clearOfRight).toBe(true)
      }
    })
  }
})

test.describe('the Telecentro card links to the product, not the site root', () => {
  for (const route of ROUTES) {
    test(`${route}: the anchor href is the /t-play override`, async ({ page }) => {
      await page.goto(route)

      const shot = page.locator('.frame[src="/previews/telecentro.com.ar.jpg"]')
      const card = page.locator('a.card', { has: shot })
      await expect(card).toHaveAttribute('href', 'https://telecentro.com.ar/t-play')
    })
  }
})
