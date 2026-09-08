/**
 * Regenerates `public/og.png`, the 1200x630 card every share of the site renders.
 *
 * Run it by hand when the hero copy or the mark changes:
 *
 *     bun scripts/make-og.ts
 *
 * The template is `scripts/og.html`; the copy comes from `content.json` and the mark
 * from `restingPolygons`, the same pure function the nav and the canvas project, so the
 * card cannot disagree with the site about either.
 */
import { chromium } from '@playwright/test'
import { resolve } from 'node:path'

import { content, links, site } from '../src/lib/content'
import { polyAlpha, restingPolygons, strokeWidth } from '../src/lib/motion/mark'

const SIZE = 56
const es = content.es

const mark = `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" fill="none" stroke="currentColor">${restingPolygons(
  SIZE,
)
  .map((poly) => {
    const points = poly.points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    const alpha = polyAlpha(poly, false)
    const shared = `points="${points}" stroke-opacity="${alpha.stroke}" stroke-width="${strokeWidth(poly.kind, SIZE)}"`
    return poly.points.length === 2
      ? `<polyline ${shared} />`
      : `<polygon ${shared} fill="currentColor" fill-opacity="${alpha.fill}" />`
  })
  .join('')}</svg>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })

await page.goto(`file://${resolve(import.meta.dir, 'og.html')}`)
await page.evaluate(
  ({ eyebrow, h1a, h1b, name, domain, mark }) => {
    const set = (key: string, html: string) => {
      document.querySelector(`[data-og="${key}"]`)!.innerHTML = html
    }
    set('eyebrow', eyebrow)
    set('h1', `${h1a}<br /><span>${h1b}</span>`)
    set('name', `${mark}${name}`)
    set('domain', domain)
  },
  {
    eyebrow: es.eyebrow,
    h1a: es.h1a,
    h1b: es.h1b,
    name: site.name,
    domain: links.domain.replace('https://', ''),
    mark,
  },
)
// The variable font is loaded from `file://`, so the first paint can still be the
// fallback stack: wait for the faces before the shutter.
await page.evaluate(() => document.fonts.ready)

await page.screenshot({ path: resolve(import.meta.dir, '../public/og.png') })
await browser.close()
console.log('→ public/og.png')
