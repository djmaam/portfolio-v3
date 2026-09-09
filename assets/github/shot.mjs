import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 360 }, deviceScaleFactor: 2 })
for (const theme of ['dark', 'light']) {
  await p.goto(`file://${join(here, `header-${theme}.html`)}`)
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: join(here, `header-${theme}.png`) })
}
await b.close()
