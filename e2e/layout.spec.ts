import { expect, test } from '@playwright/test'

/**
 * The page grid (spec 19). Every other test of this repo reads source or the built CSS;
 * none of them measures anything. That is exactly why `container-page` shipped 96px
 * narrower than the design for sixteen blocks — a stylesheet that says `max-width: 1200px`
 * reads correct, and only a layout engine can say whether the content box is 1200 or 1104.
 *
 * The numbers below come from the mock — `handoff/reference/Portfolio.dc.html` rendered
 * in Chromium at 1512×950 — not from our own output, so they cannot drift toward whatever
 * we happen to ship.
 */

/** `DESIGN_SPEC` §2: `max-width: 1200px; padding: 0 clamp(20px, 4vw, 48px)`. */
const CONTENT = 1200
const MAX_PAD = 48
const MIN_PAD = 20

/** The mock's own geometry at a 1512px viewport: content 1200 wide, starting at x=156. */
const WIDE = { viewport: 1512, content: CONTENT, left: (1512 - CONTENT) / 2 }

const ROUTES = ['/', '/en']

/** The content box of the first `container-page` on the page, and where it starts. */
const measure = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.container-page')
    if (!el) throw new Error('no .container-page on the page')
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    const padLeft = parseFloat(style.paddingLeft)
    const padRight = parseFloat(style.paddingRight)
    return {
      content: rect.width - padLeft - padRight,
      left: rect.left + padLeft,
      right: rect.right - padRight,
      padLeft,
      padRight,
      boxSizing: style.boxSizing,
    }
  })

for (const route of ROUTES) {
  test(`${route} lays its content out on the mock's 1200px grid`, async ({ page }) => {
    await page.setViewportSize({ width: WIDE.viewport, height: 950 })
    await page.goto(route)

    const box = await measure(page)
    expect(box.content).toBeCloseTo(WIDE.content, 0)
    expect(box.left).toBeCloseTo(WIDE.left, 0)
    // The padding is still there — the cap moved, the gutter did not.
    expect(box.padLeft).toBeCloseTo(MAX_PAD, 0)
    expect(box.padRight).toBeCloseTo(MAX_PAD, 0)
  })

  test(`${route} keeps every container on the same grid`, async ({ page }) => {
    await page.setViewportSize({ width: WIDE.viewport, height: 950 })
    await page.goto(route)

    // One misaligned section is the bug class this file exists for, and the first
    // container agreeing with the mock says nothing about the other eight.
    const edges = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.container-page')].map((el) => {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return {
          left: Math.round(rect.left + parseFloat(style.paddingLeft)),
          width: Math.round(
            rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
          ),
        }
      }),
    )

    expect(edges.length).toBeGreaterThan(5)
    for (const edge of edges) {
      expect(edge).toEqual({ left: WIDE.left, width: WIDE.content })
    }
  })
}

test('below the cap the container is the viewport minus its gutters', async ({ page }) => {
  // `box-sizing` only touches an explicit `max-width`, so nothing here may move: with
  // `width: auto` the content box has always been the parent minus the padding. This is
  // the assertion that says the fix changed only what it was meant to change.
  for (const [width, pad] of [
    [1280, MAX_PAD],
    [390, MIN_PAD],
  ] as const) {
    await page.setViewportSize({ width, height: 950 })
    await page.goto('/')

    const box = await measure(page)
    expect(box.padLeft).toBeCloseTo(pad, 0)
    expect(box.content).toBeCloseTo(width - 2 * pad, 0)
    expect(box.left).toBeCloseTo(pad, 0)
  }
})

test('the hero H1 renders in four lines, like the mock', async ({ page }) => {
  await page.setViewportSize({ width: WIDE.viewport, height: 950 })
  await page.goto('/')

  // Measured against its own line-height rather than by counting words, so the assertion
  // survives a copy change and is the same test in both languages.
  const lines = await page.evaluate(() => {
    const h1 = document.querySelector<HTMLElement>('.hero h1')!
    return h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)
  })

  expect(Math.round(lines)).toBe(4)
})

test('the projects grid stays at three columns, which is what projectDelay assumes', async ({
  page,
}) => {
  await page.setViewportSize({ width: WIDE.viewport, height: 950 })
  await page.goto('/')

  // `projectDelay(i) = 90 * (i % 3)` hardcodes three. Four columns need 4×300 + 3×14 =
  // 1242px and the grid now has 1200, so it clears by 42 — close enough that it has to
  // be asserted rather than reasoned about.
  const columns = await page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('.cards')!
    return getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length
  })

  expect(columns).toBe(3)
})
