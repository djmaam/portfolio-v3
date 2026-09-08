import { expect, test } from '@playwright/test'
import content from '../handoff/content.json' with { type: 'json' }

const { domain } = content.links

/**
 * What the deploy adds to the build (spec 18). The `_headers` file is Cloudflare's to
 * apply and cannot be asserted against `astro preview`, but the Content-Security-Policy
 * is the half that ships inside the HTML — and it is the half that can silently break
 * the page, because a blocked script fails without a visible symptom.
 */
test('the policy blocks nothing the page actually does', async ({ page }) => {
  const violations: string[] = []
  // Chromium reports a blocked resource as a console error naming the directive, which
  // is the only signal a headless run gets: the page still renders, just wrong.
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) {
      violations.push(message.text())
    }
  })

  for (const route of ['/', '/en']) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
  }

  expect(violations).toEqual([])
})

test('robots and sitemap name the two routes and each other', async ({ request }) => {
  const robots = await request.get('/robots.txt')
  expect(robots.ok()).toBe(true)
  expect(await robots.text()).toContain(`Sitemap: ${domain}/sitemap.xml`)

  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.ok()).toBe(true)
  const xml = await sitemap.text()
  expect(xml).toContain(`<loc>${domain}/</loc>`)
  expect(xml).toContain(`<loc>${domain}/en</loc>`)
  expect(xml).toContain('hreflang="x-default"')
})

test('the social card the head points at exists', async ({ request }) => {
  const og = await request.get('/og.png')
  expect(og.ok()).toBe(true)
  expect(og.headers()['content-type']).toContain('image/png')
})
