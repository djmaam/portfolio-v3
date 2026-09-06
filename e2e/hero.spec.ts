import { expect, test, type Page } from '@playwright/test'

/**
 * The hero against the mock (spec 27). Like `e2e/layout.spec.ts`, every number here was
 * measured on `handoff/reference/Portfolio.dc.html` in Chromium at 1512×950, dark — not
 * on our own output, so the assertions cannot drift toward whatever we happen to ship.
 *
 * This file owns hero geometry only. It asserts nothing about any other section, so a
 * sibling block landing next to it cannot break it.
 */

// Dark, like every number the mock was measured at — and the ink comparisons below only
// read as "more cloud is brighter" on the dark ground.
test.use({ colorScheme: 'dark' })

const VIEWPORT = { width: 1512, height: 950 }

/** The mock's hero: 909px tall, stats row ending at y=862, console centered at x=1074. */
const MOCK = { heroHeight: 909, statsBottom: 862, consoleCenterX: 1074, asteriskLeft: 803 }

const open = async (page: Page) => {
  await page.setViewportSize(VIEWPORT)
  await page.goto('/')
}

test('the hero is as tall as the mock and keeps the stats row above the fold', async ({ page }) => {
  await open(page)

  const box = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.hero')!
    const stats = document.querySelector<HTMLElement>('.hero .stats')!
    return {
      height: hero.getBoundingClientRect().height,
      statsBottom: stats.getBoundingClientRect().bottom,
    }
  })

  // Within 5% of the mock's 909. Spec 19 brought this from 994 to 918 on its own.
  expect(Math.abs(box.height - MOCK.heroHeight) / MOCK.heroHeight).toBeLessThan(0.05)
  // The complaint this issue opened with: at a 950px viewport the stats were cut off.
  expect(box.statsBottom).toBeLessThan(VIEWPORT.height)
})

test('the canvas is the viewport box of MOTION_SPEC §3, not the hero box', async ({ page }) => {
  await open(page)

  // `100vw × 100vh` at the top of the page, which is where the mock puts it. Tying it to
  // the hero instead makes `ry = .48h`, the ✳ radius and the 55% mask cut all follow a
  // section that re-flows — the drift this assertion exists to stop.
  const box = await page.evaluate(() => {
    const rect = document.querySelector('canvas')!.getBoundingClientRect()
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
  })

  expect(box.left).toBe(0)
  expect(box.top).toBe(0)
  expect(box.width).toBe(VIEWPORT.width)
  expect(box.height).toBe(VIEWPORT.height)
})

test('the console the cloud is centered on is the console the page renders', async ({ page }) => {
  await open(page)
  // The card boots in under `scale(.96)`, and a transform moves its rect but not its
  // offsets — which is the whole reason `measure()` reads offsets. Compare once it lands.
  await page.waitForFunction(() => {
    const el = document.querySelector<HTMLElement>('[data-console]')!
    return Math.abs(el.getBoundingClientRect().width - el.offsetWidth) < 0.5
  })

  // `network.ts` measures the card by walking `offsetTop` to the hero and converting into
  // canvas coordinates; `cloudCenter` then centers the cloud on it. If those two spaces
  // ever disagree the cloud silently drifts off the console — which is exactly what an
  // offset canvas would cause. Two independent measurement paths, compared.
  const card = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas')!
    const cardEl = document.querySelector<HTMLElement>('[data-console]')!
    const section = document.querySelector<HTMLElement>('.hero')!

    let el: HTMLElement | null = cardEl
    let left = 0
    let top = 0
    while (el && el !== section) {
      left += el.offsetLeft
      top += el.offsetTop
      el = el.offsetParent as HTMLElement | null
    }
    left -= canvas.offsetLeft
    top -= canvas.offsetTop

    const canvasRect = canvas.getBoundingClientRect()
    const cardRect = cardEl.getBoundingClientRect()
    return {
      measured: { left, top },
      real: { left: cardRect.left - canvasRect.left, top: cardRect.top - canvasRect.top },
      centerX: cardRect.left + cardRect.width / 2,
    }
  })

  // Within a pixel, not to the pixel: `offsetTop` is rounded to an integer and
  // `getBoundingClientRect` is not, so the two can never agree closer than that.
  expect(Math.abs(card.measured.left - card.real.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(card.measured.top - card.real.top)).toBeLessThanOrEqual(1)
  // And the console is where the mock puts it, so the center it hands over is the right one.
  expect(card.centerX).toBeCloseTo(MOCK.consoleCenterX, 0)
})

test('the mask is applied: the cloud fades out below 55% of the canvas', async ({ page }) => {
  await open(page)
  await page.waitForTimeout(4000)

  // `mask-image` is a compositor effect, so `getImageData` cannot see it — only a
  // screenshot can. Three shots: with the mask, without it, and with the canvas gone.
  // The third is the page itself, and subtracting it leaves the cloud alone. The nodes
  // drift far too slowly to account for a difference of this size between shots.
  const shot = async () => ink(page, await page.screenshot({ animations: 'disabled' }))
  const set = (property: string, value: string) =>
    page.evaluate(
      ([key, val]) => {
        document.querySelector<HTMLElement>('canvas')!.style.setProperty(key, val)
      },
      [property, value],
    )

  const masked = await shot()
  await set('mask-image', 'none')
  const bare = await shot()
  await set('display', 'none')
  const page_ = await shot()

  // Only the bottom fifth is compared. Above the cut the page's own content moves between
  // shots — the console log is live — and the same-band, mask-on/mask-off comparison is
  // the stronger evidence anyway: the cloud below 55% is the *same* cloud in both shots,
  // so any difference is the mask and nothing else.
  const cloud = (from: { bottom: number }) => from.bottom - page_.bottom

  expect(cloud(bare)).toBeGreaterThan(0.05)
  expect(cloud(masked)).toBeLessThan(0.6 * cloud(bare))
})

test('the ✳ forms on the console and clears the H1, like the mock', async ({ page }) => {
  await open(page)

  // Sampled across the whole formation beat rather than at one timestamp: the frame with
  // the tightest horizontal spread is the ✳ at full `form`, whenever the load happened to
  // let it land. `MOTION_SPEC` §3 holds it from 1200 to 1900ms.
  const star = await page.evaluate(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas')!
    const ctx = canvas.getContext('2d')!
    const dpr = canvas.width / canvas.getBoundingClientRect().width
    let best: { spread: number; centerX: number; left: number } | null = null

    for (let i = 0; i < 26; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let sum = 0
      let weighted = 0
      let min = Infinity
      let max = -Infinity
      for (let y = 0; y < canvas.height; y += 2)
        for (let x = 0; x < canvas.width; x += 2) {
          const a = px[(y * canvas.width + x) * 4 + 3] as number
          if (a < 40) continue
          sum += a
          weighted += a * x
          if (x < min) min = x
          if (x > max) max = x
        }
      if (sum === 0) continue
      const spread = (max - min) / dpr
      if (!best || spread < best.spread) {
        best = { spread, centerX: weighted / sum / dpr, left: min / dpr }
      }
    }
    return best
  })

  expect(star).not.toBeNull()
  // Centered on the console, which is what `MOTION_SPEC` §3 means by "centrado en la
  // consola" and what the mock does — it measures x=1072 against a console center of 1074.
  expect(star!.centerX).toBeCloseTo(MOCK.consoleCenterX, -2)
  // And therefore clear of the headline, which is the complaint that opened this issue.
  const h1Right = await page.evaluate(
    () => document.querySelector('.hero h1')!.getBoundingClientRect().right,
  )
  expect(star!.left).toBeGreaterThan(h1Right)
  expect(star!.left).toBeGreaterThan(MOCK.asteriskLeft - 60)
})

/** Mean ink of the bottom fifth of a screenshot, decoded inside the page itself. */
async function ink(page: Page, buffer: Buffer): Promise<{ bottom: number }> {
  return page.evaluate(async (data) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + data
    await img.decode()
    const surface = document.createElement('canvas')
    surface.width = img.width
    surface.height = img.height
    const ctx = surface.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const px = ctx.getImageData(0, 0, surface.width, surface.height).data
    const band = (from: number, to: number) => {
      let sum = 0
      let n = 0
      for (let y = Math.floor(from * surface.height); y < Math.floor(to * surface.height); y++)
        for (let x = 0; x < surface.width; x += 2) {
          const i = (y * surface.width + x) * 4
          sum += (px[i] as number) + (px[i + 1] as number) + (px[i + 2] as number)
          n += 3
        }
      return sum / n
    }
    return { bottom: band(0.8, 1) }
  }, buffer.toString('base64'))
}
