import { expect, test } from 'bun:test'

/**
 * Two defects in the same file (spec 20):
 *
 * 1. `.nav` padded its own edges instead of sharing `container-page` (issue 19), so its
 *    contents drifted 108px outside the page grid above the container's 1296px cap.
 * 2. The lang toggle (`ES / en`) rendered on two lines: a grid container wraps every
 *    stray text run in its own anonymous item, and `grid-auto-flow: row` stacks them.
 *
 * Both are geometry bugs a real layout engine has to confirm — see `e2e/nav.spec.ts` for
 * the browser assertions. This file only checks the source says what it should.
 */

const source = await Bun.file(new URL('../src/components/Nav.astro', import.meta.url)).text()
const [, , body = ''] = /^---([\s\S]*?)^---([\s\S]*)$/m.exec(source) ?? []
const markup = body
  .replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<script[\s\S]*?<\/script>/g, '')
const styles = [...body.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(([, css]) => css!).join('\n')

/** The `{ ... }` block that opens at `index`, matched by brace, closing brace included. */
const blockAt = (css: string, index: number) => {
  const open = css.indexOf('{', index)
  let depth = 0
  for (let end = open; end < css.length; end++) {
    if (css[end] === '{') depth++
    else if (css[end] === '}' && --depth === 0) return css.slice(index, end + 1)
  }
  return css.slice(index)
}

const ruleFor = (css: string, selector: string) => {
  const at = css.indexOf(`${selector} {`)
  if (at === -1) throw new Error(`no \`${selector}\` rule in Nav.astro's <style>`)
  return blockAt(css, at)
}

test('the nav bar itself carries no edge padding — an inner wrapper owns the grid', () => {
  const nav = ruleFor(styles, '.nav')
  expect(nav).not.toMatch(/padding-inline/)
  // Still full width for the glass background and the border; only its contents align.
  expect(nav).toMatch(/height:\s*var\(--nav-h\)/)
})

test('brand, links and toggles live inside a `.inner.container-page` wrapper', () => {
  expect(markup).toMatch(/<nav class="nav">/)
  // container-page is the same utility every other section uses (spec 19) — the fix
  // reuses it rather than reimplementing the 1200px / clamp math here.
  expect(markup).toMatch(/<div class="inner container-page">/)

  const inner = ruleFor(styles, '.inner')
  expect(inner).toMatch(/display:\s*flex/)
  expect(inner).toMatch(/height:\s*100%/)
})

test('--nav-h is never redefined here — the height every anchor offset depends on', () => {
  expect(styles).not.toMatch(/--nav-h:/)
})

test('the toggle pill is a flex row, not a grid — a grid stacks the lang toggle', () => {
  const toggle = ruleFor(styles, '.toggle')
  expect(toggle).toMatch(/display:\s*flex/)
  expect(toggle).not.toMatch(/display:\s*grid/)
  expect(toggle).not.toMatch(/place-items/)
  // The pill's own footprint is unchanged.
  expect(toggle).toMatch(/height:\s*34px/)
  expect(toggle).toMatch(/border-radius:\s*999px/)
})

test('the lang toggle is still a real link, translatable without JS', () => {
  expect(markup).toMatch(/<a\s+class="toggle lang[^"]*"\s+href=\{siblingHref\}/)
  expect(markup).toMatch(/rel="alternate"/)
  expect(markup).toMatch(/data-lang-toggle=\{otherLang\}/)
})
