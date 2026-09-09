import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1584, height: 396 }, deviceScaleFactor: 2 })
for (const lang of ['es', 'en']) {
  await p.goto(
    `file:///Users/djmaam/Projects/Marcos/portfolio-v3/assets/linkedin/banner-${lang}.html`,
  )
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `assets/linkedin/banner-${lang}.png` })
}
await b.close()
