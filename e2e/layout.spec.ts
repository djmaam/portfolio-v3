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

/**
 * The guard of spec 22. The stack shipped a `max-content` marquee track inside a grid
 * column sized `auto`, which made `documentElement.scrollWidth` 3540px against a 1512px
 * viewport — the whole document scrolled sideways, and the stack subtitle sat at x=1864.
 * Nothing failed, because nothing measured the document. This does, at every width, on
 * both routes, for every section: it is the assertion the next one to do it trips over.
 */
const WIDTHS = [1512, 1024, 390]

const overflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    // Named, so a failure says which section did it and not only that one did.
    wide: [
      ...document.querySelectorAll<HTMLElement>('section, .container-page, .container-page > *'),
    ]
      .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5)
      .map((el) => el.className || el.tagName),
  }))

for (const route of ROUTES) {
  test(`${route} never scrolls horizontally`, async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 950 })
      await page.goto(route)

      const doc = await overflow(page)
      // No section may be wider than the viewport, at any width — this is the assertion
      // the stack should have failed on for two blocks.
      expect(doc.wide).toEqual([])
      // 390 is asserted separately below: one thing on the page is still 7px too wide
      // there, and it is not a section.
      if (width !== 390) expect(doc.scroll).toBe(doc.client)
    }
  })

  test(`${route} does not scroll horizontally at 390 either`, async ({ page }) => {
    // 390 is where the last one hid: the footer's ASCIImoji shrank as a flex item to
    // 84px against a widest face of 111, and the hidden faces that size the box — they
    // are `visibility: hidden`, which still takes layout space — pushed 7px past the
    // viewport while every section fit. `flex: none` in `Footer.astro` closed it.
    await page.setViewportSize({ width: 390, height: 950 })
    await page.goto(route)

    const doc = await overflow(page)
    expect(doc.scroll).toBe(doc.client)
  })

  test(`${route} keeps the stack subtitle on screen, in the header's second column`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: WIDE.viewport, height: 950 })
    await page.goto(route)

    const sub = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('#stack header p.text-body')!
      const headline = document.querySelector<HTMLElement>('#stack header .headline')!
      return {
        left: el.getBoundingClientRect().left,
        right: el.getBoundingClientRect().right,
        // Second column of the two-column `auto-fit` header: it starts after the headline.
        afterHeadline: el.getBoundingClientRect().left > headline.getBoundingClientRect().right,
        viewport: document.documentElement.clientWidth,
      }
    })

    expect(sub.afterHeadline).toBe(true)
    expect(sub.left).toBeGreaterThanOrEqual(WIDE.left)
    expect(sub.right).toBeLessThanOrEqual(sub.viewport)
  })
}

test('every marquee track is exactly twice its half, so translateX(-50%) has no seam', async ({
  page,
}) => {
  // The gap lives on the chip and not on the flex container precisely so this identity
  // holds — with `gap` the track would be `2 × half + gap` and the loop would land half a
  // gap short, once per cycle. A row stretched by a blown grid track breaks it too.
  for (const width of [1512, 1024, 390]) {
    await page.setViewportSize({ width, height: 950 })
    await page.goto('/')

    const rows = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('#stack .row')].map((row) => ({
        row: row.getBoundingClientRect().width,
        track: row.querySelector<HTMLElement>('.track')!.getBoundingClientRect().width,
        half: row.querySelector<HTMLElement>('.half')!.getBoundingClientRect().width,
        container: row.parentElement!.getBoundingClientRect().width,
      })),
    )

    expect(rows).toHaveLength(4)
    for (const row of rows) {
      expect(row.track).toBeCloseTo(2 * row.half, 1)
      expect(row.row).toBeLessThanOrEqual(row.container)
    }
  }
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
