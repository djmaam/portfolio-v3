import { expect, test } from '@playwright/test'

/**
 * The experience timeline (spec 23). Two geometry defects that no existing test
 * catches, because every other test of this section reads source or the built CSS:
 * the rail dot was 15px off the logo it is supposed to mark, and the "also with" list
 * fell back to `display: block` and rendered as a column instead of a row.
 */

test.describe('the rail dot centers on the logo it marks', () => {
  for (const [label, width] of [
    ['wide', 1512],
    ['narrow', 390],
  ] as const) {
    test(`at ${width}px (${label})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 })
      await page.goto('/')

      // Measured against the logo's own rendered center, not a hardcoded pixel value,
      // so this keeps holding once issue 15 swaps in real logos.
      const centers = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.job')].map((job) => {
          const dot = job.querySelector<HTMLElement>('.dot')!
          const logo = job.querySelector<HTMLElement>('.logo')!
          const dotRect = dot.getBoundingClientRect()
          const logoRect = logo.getBoundingClientRect()
          return {
            dot: dotRect.top + dotRect.height / 2,
            logo: logoRect.top + logoRect.height / 2,
          }
        }),
      )

      expect(centers.length).toBe(5)
      for (const { dot, logo } of centers) {
        expect(Math.abs(dot - logo)).toBeLessThanOrEqual(1)
      }
    })
  }
})

test.describe('the also-with row', () => {
  test('lays out on one line at 1512px', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 950 })
    await page.goto('/')

    const box = await page.evaluate(() => {
      const list = document.querySelector<HTMLElement>('.also-list')!
      const items = [...list.children] as HTMLElement[]
      const tops = items.map((item) => Math.round(item.getBoundingClientRect().top))
      return {
        display: getComputedStyle(list).display,
        height: list.getBoundingClientRect().height,
        rowCount: new Set(tops).size,
      }
    })

    expect(box.display).toBe('flex')
    expect(box.rowCount).toBe(1)
    // One row's worth: well short of the 96px four stacked lines measured before the fix.
    expect(box.height).toBeLessThan(40)
  })

  test('wraps instead of overflowing at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 950 })
    await page.goto('/')

    const overflow = await page.evaluate(() => {
      const list = document.querySelector<HTMLElement>('.also-list')!
      return [...list.querySelectorAll<HTMLElement>('li')].some(
        (li) => li.getBoundingClientRect().right > window.innerWidth,
      )
    })

    expect(overflow).toBe(false)
  })
})

test('the company scramble still fires once per name', async ({ page }) => {
  await page.goto('/')

  const names = page.locator('[data-company]')
  const before = await names.allTextContents()

  await page.evaluate(() => {
    document.querySelector('#work')!.scrollIntoView()
  })
  // The scramble runs for 1000ms (`scramble(entry.target, 1000)`); give it margin.
  await page.waitForTimeout(1400)

  const after = await names.allTextContents()
  expect(after).toEqual(before)
})

test('with reduced motion, company names stay resolved from the markup', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const names = page.locator('[data-company]')
  const before = await names.allTextContents()

  await page.evaluate(() => {
    document.querySelector('#work')!.scrollIntoView()
  })
  await page.waitForTimeout(300)

  const after = await names.allTextContents()
  expect(after).toEqual(before)
  for (const text of after) expect(text.length).toBeGreaterThan(0)
})
