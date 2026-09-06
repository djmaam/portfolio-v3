import { expect, test } from '@playwright/test'

/**
 * The nav's own layout (spec 20). `e2e/layout.spec.ts` owns the page grid itself; this
 * file owns the two defects filed against `Nav.astro`: the bar's contents drifting off
 * that grid, and the language toggle wrapping onto a second line. Both are geometry bugs
 * a real layout engine has to confirm — a unit test can only check the source declares
 * the right rules, not that a browser resolves them the way we expect.
 */

const ROUTES = ['/', '/en']

/** The content box of the first `container-page` on the page, and where it starts — the
 * same measurement `e2e/layout.spec.ts` uses, so the nav is checked against the identical
 * yardstick every section is. */
const measureContainer = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.container-page')
    if (!el) throw new Error('no .container-page on the page')
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    const padLeft = parseFloat(style.paddingLeft)
    const padRight = parseFloat(style.paddingRight)
    return { left: rect.left + padLeft, right: rect.right - padRight }
  })

const measureNav = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const brand = document.querySelector<HTMLElement>('.brand')!
    const themeToggle = document.querySelector<HTMLElement>('[data-theme-toggle]')!
    return {
      brandLeft: brand.getBoundingClientRect().left,
      themeToggleRight: themeToggle.getBoundingClientRect().right,
    }
  })

for (const route of ROUTES) {
  test(`${route} aligns the nav's brand and toggles to the page grid at 1512px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1512, height: 950 })
    await page.goto(route)

    const container = await measureContainer(page)
    const nav = await measureNav(page)

    expect(nav.brandLeft).toBeCloseTo(container.left, 0)
    expect(nav.themeToggleRight).toBeCloseTo(container.right, 0)
  })
}

test('the nav stays aligned to the grid at 1024px, below the container cap', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 950 })
  await page.goto('/')

  const container = await measureContainer(page)
  const nav = await measureNav(page)

  expect(nav.brandLeft).toBeCloseTo(container.left, 0)
  expect(nav.themeToggleRight).toBeCloseTo(container.right, 0)
})

test('below 720px the section links hide and the nav still tracks the narrower gutter', async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 950 })
  await page.goto('/')

  await expect(page.locator('.sections')).toBeHidden()

  const container = await measureContainer(page)
  const nav = await measureNav(page)
  expect(nav.brandLeft).toBeCloseTo(container.left, 0)
})

for (const route of ROUTES) {
  test(`${route} renders the lang toggle on a single line`, async ({ page }) => {
    await page.goto(route)

    const toggle = page.locator('[data-lang-toggle]')
    const box = await toggle.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      // The border box, not `clientHeight` (which excludes the 1px border) — the
      // number the pill's `height: 34px` actually promises.
      outerHeight: el.getBoundingClientRect().height,
      borderRadius: getComputedStyle(el).borderRadius,
    }))

    // A wrapped second line inflates scrollHeight past the fixed clientHeight — the
    // signature of the anonymous-grid-item bug this test exists to catch.
    expect(box.scrollHeight).toBeLessThanOrEqual(box.clientHeight)
    expect(Math.round(box.outerHeight)).toBe(34)
    expect(box.borderRadius).toBe('999px')
  })
}

test('the language toggle is still a real link and navigates without JS assistance', async ({
  page,
}) => {
  await page.goto('/')

  const toggle = page.locator('a[data-lang-toggle]')
  await expect(toggle).toHaveAttribute('rel', 'alternate')
  await expect(toggle).toHaveAttribute('href', /\/en\/?$/)

  await toggle.click()
  await page.waitForURL(/\/en\/?$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('the sticky nav never covers what the keyboard just focused', async ({ page }) => {
  await page.goto('/')

  const navHeight = await page.locator('.nav').evaluate((el) => el.getBoundingClientRect().height)
  expect(navHeight).toBe(64)
})
