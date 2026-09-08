#!/usr/bin/env bun
// The favicon is the nav mark, not a second logo: same module, same 20px box, so the
// tab icon is the exact frame `CubeMark.astro` renders before the canvas takes over.
// Regenerate with `bun scripts/make-favicon.ts` after touching `src/lib/motion/mark.ts`.

import { chromium } from '@playwright/test'
import { polyAlpha, restingPolygons, strokeWidth } from '../src/lib/motion/mark'

// Nav draws the mark at 20: below `DETAIL_MIN`, so the ticks, panels and corner cubes
// are already dropped. That reduced cluster is the shape that survives at 16px in a tab.
const BOX = 20

// The only two literals in the project outside `app.css`: an SVG in `public/` cannot read
// `@theme`, so `--color-accent` and `--color-bg` are inlined here. `scripts/` is outside
// `check-tokens.ts`'s root on purpose.
const ACCENT_LIGHT = '#0a8faf'
const ACCENT_DARK = '#3ee7ff'
const BG_DARK = '#08090c'

// `light: true` everywhere: those alphas are the higher of the two, and one set of shapes
// has to carry both tab bars.
const polys = restingPolygons(BOX)
const shapes = polys
  .map((poly) => {
    const alpha = polyAlpha(poly, true)
    const points = poly.points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    const width = strokeWidth(poly.kind, BOX).toFixed(2)
    return poly.points.length === 2
      ? `<polyline points="${points}" stroke-opacity="${alpha.stroke.toFixed(3)}" stroke-width="${width}"/>`
      : `<polygon points="${points}" fill="currentColor" fill-opacity="${alpha.fill.toFixed(3)}" stroke-opacity="${alpha.stroke.toFixed(3)}" stroke-width="${width}"/>`
  })
  .join('\n  ')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" fill="none" stroke="currentColor" color="${ACCENT_LIGHT}">
  <style>@media (prefers-color-scheme: dark) { svg { color: ${ACCENT_DARK} } }</style>
  ${shapes}
</svg>
`

await Bun.write('public/favicon.svg', svg)

// Safari still ignores SVG favicons, and iOS wants an opaque square. Both rasters come
// from the SVG above through the browser the e2e suite already installs.
const browser = await chromium.launch()
const page = await browser.newPage()

const shoot = async (path: string, px: number, color: string, background?: string) => {
  await page.setViewportSize({ width: px, height: px })
  await page.setContent(
    `<body style="margin:0;${background ? `background:${background}` : ''}">${svg.replace(`color="${ACCENT_LIGHT}"`, `width="${px}" height="${px}" color="${color}"`)}</body>`,
  )
  // `type` is explicit because the `.ico` name gives Playwright no extension to infer from.
  await Bun.write(path, await page.screenshot({ type: 'png', omitBackground: !background }))
}

// Kept at `.ico` so the browsers that probe `/favicon.ico` blind still find it — PNG bytes
// under that name is what Astro's own default shipped. A raster has no media query, so it
// takes the darker accent: the one that survives on a light tab bar as well as a dark one.
await shoot('public/favicon.ico', 32, ACCENT_LIGHT)
await shoot('public/apple-touch-icon.png', 180, ACCENT_DARK, BG_DARK)

await browser.close()
console.log(`favicon.svg (${BOX}px box, ${polys.length} shapes), favicon.ico, apple-touch-icon.png`)
