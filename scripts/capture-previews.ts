/**
 * Regenerates `public/previews/<host>.jpg`, one per project in `content.json`.
 *
 * Every preview is a static screenshot: the live iframes pulled 40-50 third-party
 * requests into the page and cost the Lighthouse budget of spec 17 (Performance 0.82,
 * Best Practices 0.79 on `/en`). Run this by hand when a client site is redesigned:
 *
 *     bun scripts/capture-previews.ts [host ...]
 *
 * Playwright is already the dev dependency of the E2E suite, so this adds nothing.
 */
import { chromium } from '@playwright/test'

import { content } from '../src/lib/content'
import { projectUrl } from '../src/lib/projects'

// 16:11, the aspect ratio of the card's `.preview` box. The page lays out at 1440 CSS
// pixels — a desktop, not a squeezed phone — and is written out at two thirds of that,
// which is still ~2.7x the ~360px the card is ever painted at and a third of the bytes.
const VIEWPORT = { width: 1440, height: 990 }
const SCALE = 2 / 3

// Cookie walls make for a useless preview, so the first matching control gets clicked.
// Spanish and English, the two languages these sites ship in.
const CONSENT =
  /^(accept|accept all|allow all|got it|ok|agree|i agree)|(acept|entend|de acuerdo|permitir)/i

const hosts = new Set(content.es.projects.map((project) => project.host))
const only = process.argv.slice(2)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: SCALE })

for (const project of content.es.projects) {
  if (only.length > 0 && !only.includes(project.host)) continue
  if (!hosts.delete(project.host)) continue

  const url = projectUrl(project.host, project.url)
  console.log(`→ ${project.host} (${url})`)
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})

  for (const button of await page.getByRole('button').all()) {
    const label = (await button.textContent().catch(() => ''))?.trim() ?? ''
    if (!CONSENT.test(label)) continue
    await button.click({ timeout: 5_000 }).catch(() => {})
    break
  }

  // Entrance animations are the norm on these sites; a screenshot taken mid-fade is a
  // screenshot of nothing.
  await page.waitForTimeout(4_000)
  // JPEG, not PNG: these are photographic screenshots, where PNG cost 2.5 MB across the
  // six against 723 KB here for the same 960x660 pixels.
  await page.screenshot({ path: `public/previews/${project.host}.jpg`, quality: 82 })
}

await browser.close()
