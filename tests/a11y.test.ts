import { expect, test } from 'bun:test'

import { Glob } from 'bun'

import { ui } from '../src/lib/ui'

// ── The built site ───────────────────────────────────────────────────────────
// Every other test of this repo reads source. These read `dist/`, because the assertions
// below are the ones no single component can make: they are about what the whole site
// emits once Astro has scoped the styles and Lightning CSS has merged the media queries.
// The build takes well under a second, so it runs here rather than being assumed.

const root = Bun.fileURLToPath(new URL('../', import.meta.url))

const build = Bun.spawnSync(['bun', 'run', 'build'], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
if (build.exitCode !== 0) {
  throw new Error(`astro build failed:\n${build.stderr.toString()}${build.stdout.toString()}`)
}

const pages = {
  '/': await Bun.file(`${root}dist/index.html`).text(),
  '/en': await Bun.file(`${root}dist/en/index.html`).text(),
}

const stylesheets = await Array.fromAsync(new Glob('dist/**/*.css').scan({ cwd: root }))
const css = (await Promise.all(stylesheets.map((file) => Bun.file(root + file).text()))).join('\n')

// ── Reduced motion, whole-site sweep ─────────────────────────────────────────
// The assertion no single block could make. Each section guards its own motion; only the
// built stylesheet can say whether *every* one of them did.

/**
 * Every declaration of the built CSS with the stack of at-rules that encloses it.
 * Minified CSS is one line, so this walks braces instead of matching a shape.
 */
function declarations(styles: string) {
  const found: { declaration: string; selector: string; enclosing: string[] }[] = []
  const stack: string[] = []
  let buffer = ''

  const flush = () => {
    const declaration = buffer.trim()
    buffer = ''
    if (!declaration.includes(':')) return
    const selector = stack.at(-1) ?? ''
    found.push({ declaration, selector, enclosing: [...stack] })
  }

  for (const char of styles) {
    if (char === '{') {
      stack.push(buffer.trim())
      buffer = ''
    } else if (char === '}') {
      flush()
      stack.pop()
    } else if (char === ';') {
      flush()
    } else {
      buffer += char
    }
  }
  return found
}

const built = declarations(css)
const guarded = (enclosing: string[]) =>
  enclosing.some((at) => at.includes('prefers-reduced-motion') && at.includes('no-preference'))

test('every animation in the built CSS sits inside a no-preference block', () => {
  const unguarded = built
    .filter(({ declaration }) => /^animation\s*:/.test(declaration))
    .filter(({ enclosing }) => !guarded(enclosing))
    .map(({ selector, declaration }) => `${selector} { ${declaration} }`)

  expect(unguarded).toEqual([])
})

/** The properties whose transition actually moves something on screen. */
const MOVING =
  /\b(all|transform|translate|rotate|scale|gap|row-gap|column-gap|top|right|bottom|left|inset|width|height|margin|padding)\b/

test('every transition of a moving property sits inside a no-preference block', () => {
  const unguarded = built
    .filter(({ declaration }) => /^transition\s*:/.test(declaration) && MOVING.test(declaration))
    .filter(({ enclosing }) => !guarded(enclosing))
    .map(({ selector, declaration }) => `${selector} { ${declaration} }`)

  expect(unguarded).toEqual([])
})

test('no hover state moves an element outside a no-preference block', () => {
  const unguarded = built
    .filter(({ selector }) => selector.includes(':hover'))
    .filter(({ declaration }) =>
      /^(transform|translate|rotate|scale|gap|row-gap|column-gap)\s*:/.test(declaration),
    )
    .filter(({ enclosing }) => !guarded(enclosing))
    .map(({ selector, declaration }) => `${selector} { ${declaration} }`)

  expect(unguarded).toEqual([])
})

test('every hidden resting state is behind .has-js, so the page reads without JavaScript', () => {
  const hidden = built
    .filter(({ declaration }) => /^opacity\s*:\s*0(\.\d+)?$/.test(declaration))
    .filter(({ selector }) => /\[data-(reveal|boot|word)\]/.test(selector))
    .filter(
      ({ selector, enclosing }) =>
        ![selector, ...enclosing].some((part) => part.includes('has-js')),
    )
    .map(({ selector }) => selector)

  expect(hidden).toEqual([])
})

// ── The focus ring ───────────────────────────────────────────────────────────

test('the global focus ring is :focus-visible, never :focus', () => {
  const ring = built.filter(
    ({ selector, declaration }) =>
      selector.includes(':focus-visible') && /^outline\s*:/.test(declaration),
  )
  expect(ring.length).toBeGreaterThan(0)
  expect(ring.some(({ declaration }) => declaration.includes('var(--color-accent)'))).toBe(true)

  // A bare `:focus` outline would leave a ring behind after a mouse click.
  const bare = built
    .filter(({ selector }) => /:focus(?![\w-])/.test(selector))
    .filter(({ declaration }) => /^outline/.test(declaration))
    .map(({ selector }) => selector)
  expect(bare).toEqual([])
})

test('inside the contact card the ring uses the inverted accent', async () => {
  // The card inverts the theme, so `--color-accent` resolves against a background it was
  // never measured on — the contrast bug of issue 13, in the one place the global rule
  // cannot be right. Asserted on the built CSS, because Astro's scoping is what decides
  // whether the override actually reaches the email and the pills.
  const override = built.find(
    ({ selector, declaration }) =>
      selector.includes('.card') &&
      selector.includes(':focus-visible') &&
      declaration.includes('--color-contact-accent'),
  )
  expect(override?.declaration).toMatch(/^outline-color:/)

  // The duplicate that would drift: the global rule covers the project cards now.
  const projects = await Bun.file(`${root}src/components/Projects.astro`).text()
  expect(projects).not.toContain(':focus-visible')
})

// ── Headings, landmarks and the tab order ────────────────────────────────────

/** The tags of the built HTML, in document order, with their attributes. */
const tags = (html: string, names: string) =>
  [...html.matchAll(new RegExp(`<(${names})\\b([^>]*)>`, 'g'))].map(([, name, attributes]) => ({
    name: name!,
    attributes: attributes!,
  }))

test.each(Object.keys(pages))('%s has exactly one <h1>', (route) => {
  expect(tags(pages[route as keyof typeof pages], 'h1').length).toBe(1)
})

test.each(Object.keys(pages))('%s never skips a heading level', (route) => {
  const levels = tags(pages[route as keyof typeof pages], 'h[1-6]').map(({ name }) =>
    Number(name[1]),
  )
  expect(levels[0]).toBe(1)
  const skips = levels.filter((level, index) => index > 0 && level > levels[index - 1]! + 1)
  expect(skips).toEqual([])
})

test.each(Object.keys(pages))('%s names every section that carries an id', (route) => {
  const unnamed = tags(pages[route as keyof typeof pages], 'section')
    .filter(({ attributes }) => /\sid=/.test(attributes))
    .filter(({ attributes }) => !/aria-label(ledby)?=/.test(attributes))
  expect(unnamed).toEqual([])
})

test.each(Object.keys(pages))('%s keeps every preview iframe out of the tab order', (route) => {
  const frames = tags(pages[route as keyof typeof pages], 'iframe')
  expect(frames.length).toBeGreaterThan(0)
  for (const { attributes } of frames) {
    expect(attributes).toMatch(/aria-hidden="true"/)
    expect(attributes).toMatch(/tabindex="-1"/)
  }
})

test.each(Object.keys(pages))('%s keeps the decorative glyphs out of the tree', (route) => {
  const html = pages[route as keyof typeof pages]
  // The canvas and the marquee clones are covered by `network.test.ts` and
  // `stack.test.ts`; these are the glyphs, which are spread over four components.
  for (const glyph of ['✳', '↗']) {
    for (const match of html.matchAll(new RegExp(`<[^>]*>[^<]*${glyph}`, 'g'))) {
      expect(match[0]).toContain('aria-hidden')
    }
  }
  expect(html).toContain('role="log"')
  expect(html).toContain('aria-live="off"')
})

test.each(Object.entries(pages))(
  '%s makes the skip link the first focusable element',
  (route, html) => {
    const focusable = tags(html, 'a|button|input|select|textarea|iframe').filter(
      ({ attributes }) => !/tabindex="-1"/.test(attributes),
    )
    const first = focusable[0]
    expect(first?.name).toBe('a')
    expect(first?.attributes).toContain('href="#main"')

    const lang = route === '/en' ? 'en' : 'es'
    expect(html).toContain(ui[lang].skipToContent)
    // And the target has to be able to take the focus the link sends it.
    expect(html).toMatch(
      /<main[^>]*id="main"[^>]*tabindex="-1"|<main[^>]*tabindex="-1"[^>]*id="main"/,
    )
  },
)

test('the sticky nav never covers what the keyboard just focused', async () => {
  const app = await Bun.file(`${root}src/styles/app.css`).text()
  // `scroll-margin-top` (issue 08) answers fragment jumps; focus scrolling is the
  // scroll container's own padding, which is a different property.
  expect(app).toMatch(/scroll-padding-top:\s*var\(--nav-h\)/)
})

test.each(Object.entries(pages))('%s reaches its translation without JavaScript', (route, html) => {
  const sibling = route === '/en' ? '/' : '/en'
  const toggle = tags(html, 'a').find(({ attributes }) => attributes.includes('data-lang-toggle'))
  expect(toggle?.attributes).toContain(`href="${sibling}"`)
  expect(toggle?.attributes).toContain('rel="alternate"')
})
