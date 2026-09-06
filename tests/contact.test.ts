import { expect, test } from 'bun:test'

import { links } from '../src/lib/content'

const source = await Bun.file(new URL('../src/components/Contact.astro', import.meta.url)).text()
const [, frontmatter = '', body = ''] = /^---([\s\S]*?)^---([\s\S]*)$/m.exec(source) ?? []
const markup = body.replace(/<style[\s\S]*?<\/style>/g, '')
const styles = [...body.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(([, css]) => css!).join('\n')
const appCss = await Bun.file(new URL('../src/styles/app.css', import.meta.url)).text()

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

test('every link comes from content.json, and the mailto is the email', () => {
  expect(frontmatter).toMatch(/import \{[^}]*links[^}]*\} from '\.\.\/lib\/content'/)
  expect(source).toMatch(/mailto:\$\{links\.email\}/)
  // No URL and no address is retyped here: content.json is the only source.
  expect(source).not.toContain('https://')
  expect(source).not.toContain(links.email)
  for (const key of ['github', 'linkedin', 'telegram'] as const) {
    expect(source).toContain(key)
    expect(source).not.toContain(links[key])
  }
})

test('the copy comes from content.ts, brand names included', () => {
  expect(markup).toMatch(/t\.secContact/)
  expect(markup).toMatch(/t\.contactTitle/)
  expect(markup).toMatch(/t\.contactSub/)
  // The pill labels are the `links` keys upper-cased, so they are not copy either.
  for (const label of ['GITHUB', 'LINKEDIN', 'TELEGRAM', 'CONTACTO', 'CONTACT']) {
    expect(markup).not.toContain(label)
  }
})

test('the card paints itself with the inverted pair of tokens', () => {
  expect(styles).toMatch(/background:\s*var\(--color-contact-card\)/)
  expect(styles).toMatch(/color:\s*var\(--color-contact-ink\)/)
  // Both are the theme's own colors swapped, which is what makes the card inverted in
  // light and in dark alike.
  expect(appCss).toMatch(/--color-contact-card:\s*light-dark\(#0b0d12,\s*#f3f5f9\)/)
  expect(appCss).toMatch(/--color-contact-ink:\s*light-dark\(#f3f5f9,\s*#0b0d12\)/)
  // The accent inverts with the card: it is `--color-accent` with its branches swapped,
  // which is what keeps the label, the email and the pill hover readable on the card.
  expect(appCss).toMatch(/--color-contact-accent:\s*light-dark\(#3ee7ff,\s*#0a8faf\)/)
  expect(styles).toMatch(/color:\s*var\(--color-contact-accent\)/)
  // The page's own accent stays outside the card, on the beam that turns in the border.
  expect(styles).not.toMatch(/\.card[^}]*var\(--color-accent\)/)
})

test('the icons are masks over currentColor, never a fill', () => {
  const icons = [...styles.matchAll(/mask-image:\s*url\("data:image\/svg\+xml,([^"]+)"\)/g)]
  expect(icons).toHaveLength(3)
  for (const [, uri] of icons) {
    expect(decodeURIComponent(uri!)).toMatch(/^<svg [^>]*viewBox='0 0 24 24'[^>]*><path d='/)
  }
  // A `fill` would follow neither the theme inversion nor the pill hover: the shape is
  // the mask and the color is always `currentColor`.
  expect(source).not.toMatch(/fill\s*[=:]/)
  expect(styles).toMatch(/background:\s*currentColor/)
  expect(markup).not.toContain('<img')
  expect(markup).not.toContain('<svg')
})

test('the external links open safely and the mailto stays in place', () => {
  const anchors = [...markup.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag)
  expect(anchors).toHaveLength(2)
  const [email, social] = anchors as [string, string]
  expect(email).toContain('mailto:')
  expect(email).not.toContain('target=')
  expect(social).toContain('target="_blank"')
  expect(social).toContain('rel="noopener"')
})

test('with prefers-reduced-motion: reduce nothing animates', () => {
  let rest = styles
  for (;;) {
    const at = rest.indexOf('@media (prefers-reduced-motion: no-preference)')
    if (at === -1) break
    rest = rest.replace(blockAt(rest, at), '')
  }
  expect(rest).not.toContain('animation')
  // The spin of the border and the drift of the grid, both behind the query.
  expect(styles).toMatch(/animation:\s*spin 7s linear infinite/)
  expect(styles).toMatch(/animation:\s*gridflow 6s linear infinite/)
})

test('the section needs no JavaScript and adds no listener', () => {
  expect(body).not.toContain('<script')
  expect(source).not.toContain('addEventListener')
  expect(source).not.toContain('onScroll')
  // The reveal is the shared one: `Base.astro` already binds every `[data-reveal]`.
  expect(markup).toContain('data-reveal')
})

test('both pages render the section at their contact marker', async () => {
  for (const page of ['../src/pages/index.astro', '../src/pages/en/index.astro']) {
    const text = await Bun.file(new URL(page, import.meta.url)).text()
    expect(text).toMatch(/import Contact from '[./]+components\/Contact\.astro'/)
    expect(text).toMatch(/<Contact lang=\{lang\} \/>/)
    // The other four markers belong to the sections still in flight.
    expect(text).not.toContain('section-import: contact')
    expect(text).not.toContain('section: contact')
    for (const other of ['method', 'experience', 'projects', 'stack']) {
      expect(text).toContain(`// section-import: ${other}`)
      expect(text).toContain(`{/* section: ${other} */}`)
    }
  }
})
