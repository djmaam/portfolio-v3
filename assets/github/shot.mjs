// Screenshots each header the way GitHub shows it: inside an `<img>`, where the SVG gets
// no scripts and no external resources. If a font or an animation only works when the SVG
// is the document, it breaks here — which is the point of shooting it this way.
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const page = join(here, '.shot.html') // an `<img>` in a file:// page: same origin as the SVG
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 360 } })
for (const theme of ['dark', 'light']) {
  writeFileSync(
    page,
    `<body style="margin:0"><img src="header-${theme}.svg" width="1280" height="360"></body>`,
  )
  await p.goto(`file://${page}`)
  await p.waitForTimeout(1500) // past the entrance, into the ambient loop
  await p.screenshot({ path: join(here, `header-${theme}.png`) })
}
unlinkSync(page)
await b.close()
