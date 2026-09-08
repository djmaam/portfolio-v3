import { readdir } from 'node:fs/promises'

import { expect, test } from 'bun:test'
import sharp from 'sharp'

import { content, LANGS } from '../src/lib/content'

/**
 * The timeline is DOM plumbing, so — like the console and the footer — what the unit
 * tests guard is the shape of its source: the copy comes from `content.json`, the two
 * literal colors it carries never reach the output, the scramble is the shared one, and
 * nothing hides behind JavaScript.
 */
const source = await Bun.file(new URL('../src/components/Experience.astro', import.meta.url)).text()
const [, frontmatter = '', body = ''] = /^---([\s\S]*?)^---([\s\S]*)$/m.exec(source) ?? []
/** What the server actually renders: the body without the client-side `<script>`. */
const markup = body.replace(/<script[\s\S]*?<\/script>/g, '')
const styles = /<style>([\s\S]*?)<\/style>/.exec(body)?.[1] ?? ''
const script = /<script>([\s\S]*?)<\/script>/.exec(body)?.[1] ?? ''

/**
 * A comment ships nothing, so anything asserted about the code is asserted about the
 * code alone — otherwise a comment naming what must not be emitted fails the very test
 * that guards it.
 */
const strip = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

/** A job is the current one when its `glow` is a real color rather than `transparent`. */
const current = (job: { glow: string }) => job.glow !== 'transparent'

test('the five jobs come from content.json in both languages', () => {
  for (const lang of LANGS) {
    expect(content[lang].jobs).toHaveLength(5)
    for (const job of content[lang].jobs) {
      expect(job.abbr.length).toBeGreaterThan(0)
      expect(job.stack.length).toBeGreaterThan(0)
    }
  }

  // Rendered from the list, not transcribed: one `map` over `t.jobs` and one over its
  // `stack`, and every field reached through the job.
  expect(frontmatter).toMatch(/from '\.\.\/lib\/content'/)
  expect(markup).toMatch(/t\.jobs\.map\(/)
  expect(markup).toMatch(/job\.stack\.map\(/)
  for (const field of ['abbr', 'company', 'period', 'role', 'note']) {
    expect(markup).toContain(`job.${field}`)
  }
  expect(markup).toMatch(/t\.secWork/)
  expect(markup).toMatch(/t\.workTitle/)
  expect(markup).toMatch(/t\.alsoWith/)
})

test('no copy is typed into the component', () => {
  const copy = LANGS.flatMap((lang) => {
    const t = content[lang]
    return [
      t.secWork,
      t.workTitle,
      t.alsoWith,
      ...t.jobs.flatMap((job) => [
        job.abbr,
        job.company,
        job.period,
        job.role,
        job.note,
        ...job.stack,
      ]),
    ]
  })

  for (const text of copy) expect(strip(source)).not.toContain(text)
})

test('exactly one job carries a glow, and only that one is marked current', () => {
  for (const lang of LANGS) {
    const flagged = content[lang].jobs.filter(current)
    expect(flagged).toHaveLength(1)
    expect(flagged[0]).toBe(content[lang].jobs[0]!)
  }

  // `glow` is read as a flag — compared against `transparent` — and never emitted.
  expect(frontmatter).toMatch(/glow !== 'transparent'/)
})

test('the two literal colors of content.json never reach the output', () => {
  const literals = new Set(
    LANGS.flatMap((lang) => content[lang].jobs.flatMap((job) => [job.dot, job.glow])),
  )

  for (const literal of literals) {
    if (literal === 'transparent') continue
    expect(strip(source)).not.toContain(literal)
  }

  // `dot` is the dark accent under another name: the dot is styled from the token.
  expect(strip(source)).not.toMatch(/job\.dot/)
  expect(styles).toMatch(/var\(--color-accent\)/)
  expect(styles).toMatch(/var\(--color-line\)/)
})

test('the company scramble is the shared one', () => {
  expect(script).toMatch(/import \{ scramble \} from '\.\.\/lib\/motion\/scramble'/)
  expect(script).toMatch(/scramble\([^,]+, 1000\)/)
  // No second implementation: the glyph pool and the frame math live in `math.ts`.
  expect(script).not.toContain('Math.random')
  expect(script).not.toContain('requestAnimationFrame')
})

test('the reveal is the shared one, and never shares an element with the hover transform', () => {
  expect(markup).toMatch(/data-reveal/)
  // `bindReveals` runs once from Base for the whole page; the section adds no observer
  // for it and no reveal implementation of its own.
  expect(strip(script)).not.toContain('bindReveals')
  expect(strip(script)).not.toContain('data-reveal')

  const revealed = [...markup.matchAll(/class="([\w -]+)"[^>]*data-reveal/g)].map(
    (match) => match[1]!,
  )
  expect(revealed.length).toBeGreaterThan(0)
  for (const className of revealed.flatMap((value) => value.split(' '))) {
    expect(styles).not.toMatch(new RegExp(`\\.${className}:hover[^}]*transform`))
  }
  // The hover of `DESIGN_SPEC` §4 lives one level below it.
  expect(styles).toMatch(/:hover \{[^}]*transform: translateY\(-4px\)/)
})

test('the section adds no scroll listener of its own', () => {
  expect(script).not.toMatch(/addEventListener\(\s*'scroll'/)
  expect(script).not.toContain('onScroll')
})

test('the timeline is legible with JavaScript disabled', () => {
  // Nothing in the section hides at rest: the only hidden states of the site are the
  // shared `[data-boot]` and `[data-reveal]` rules of app.css, both under `.has-js`.
  expect(styles).not.toMatch(/opacity:\s*0[;\s]/)
  expect(styles).not.toMatch(/display:\s*none/)
  expect(styles).not.toMatch(/visibility:\s*hidden/)
})

test("the rail dot's position is derived from the logo and card tokens, not a guessed constant", () => {
  // `.dot`'s offset used to be a hand-picked `margin-top: 28px` that did not track what
  // it was supposed to mark. It must now be computed from the shared tokens `.card` and
  // `.logo` also read from, so a future change to either recomputes the dot with it.
  expect(styles).toMatch(/--logo-size:\s*56px/)
  const dotBlock = /\.dot\s*\{([\s\S]*?)\n {2}\}/.exec(styles)?.[1] ?? ''
  expect(dotBlock).toMatch(/margin-top:\s*calc\(/)
  expect(dotBlock).toMatch(/var\(--logo-size\)/)
  expect(styles).not.toMatch(/margin-top:\s*28px/)
})

test('the also-with list lays its items out in a row', () => {
  // No rule at all used to leave it at the UA default `display: block`, stacking the
  // four company names into a column instead of the row `DESIGN_SPEC` §5 describes.
  expect(styles).toMatch(/\.also-list\s*\{[^}]*display:\s*flex/)
  expect(styles).toMatch(/\.also-list\s*\{[^}]*flex-wrap:\s*wrap/)
})

test('the section is the anchor the nav already links to', () => {
  expect(markup).toMatch(/<section id="work"/)
})

test('both pages render the section at their experience marker', async () => {
  for (const path of ['../src/pages/index.astro', '../src/pages/en/index.astro']) {
    const page = await Bun.file(new URL(path, import.meta.url)).text()
    expect(page).toMatch(/import Experience from '[./]*components\/Experience\.astro'/)
    expect(page).toMatch(/<Experience lang=\{lang\} \/>/)
    // Only this section's own marker is asserted. Pinning the siblings' markers here
    // would encode a transient state: each one disappears as that section lands.
    expect(page).not.toContain('section-import: experience')
    expect(page).not.toContain('{/* section: experience */}')
  }
})

/**
 * The company marks (spec 15). They are alpha masks: the timeline paints them with
 * `mask-image` over a token-colored surface, so only the shape in the alpha channel
 * survives and no brand color reaches the page.
 */
const logoDir = new URL('../src/assets/logos/', import.meta.url)
const logoFiles = (await readdir(logoDir)).filter((name) => name.endsWith('.png')).sort()

test('every mask carries a shape rather than a solid plate', async () => {
  expect(logoFiles.length).toBeGreaterThan(0)

  for (const name of logoFiles) {
    const { data, info } = await sharp(new URL(name, logoDir).pathname)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    let opaque = 0
    for (let i = 3; i < data.length; i += info.channels) if (data[i]! > 200) opaque++
    const covered = opaque / (info.width * info.height)

    // The failure this catches is silent: a mark knocked out of a colored tile masks to
    // a featureless block, which renders as a solid rounded square and errors nowhere.
    // A real mark leaves a gap; a swallowed one covers its whole box.
    expect(covered).toBeGreaterThan(0.02)
    expect(covered).toBeLessThan(0.95)
  }
})

test('every mask is named for a job it can actually reach', () => {
  // The reverse is not asserted: a job with no file falls back to the striped
  // abbreviation on purpose, which is what makes deleting one asset a safe revert.
  const abbrs = new Set(content.es.jobs.map((job) => job.abbr))
  for (const name of logoFiles) {
    expect(abbrs).toContain(name.replace('.png', ''))
  }
})

test('the mark is masked on a pseudo-element, over a token color', () => {
  // `mask` clips the element it is set on, so masking `.logo` itself would take its own
  // 1px frame and 16px radius with it.
  expect(styles).toMatch(/\.logo\.marked::before\s*\{/)
  const markBlock = /\.logo\.marked::before\s*\{([\s\S]*?)\n {2}\}/.exec(styles)?.[1] ?? ''
  expect(markBlock).toMatch(/background:\s*var\(--color-dim\)/)
  expect(markBlock).toMatch(/mask:\s*var\(--logo-src\)/)
  // Prefixed alongside the standard property: Safari below 15.4 only knows the former.
  expect(markBlock).toMatch(/-webkit-mask:\s*var\(--logo-src\)/)
  // `contain` rather than a percentage: two of the five marks are wordmarks, and a
  // percentage size would crop or squash anything that is not roughly square.
  expect(markBlock).toMatch(/contain/)

  // The stripes belong to the fallback alone, and the mark inherits the card's hover.
  expect(styles).toMatch(/\.logo:not\(\.marked\)\s*\{[^}]*repeating-linear-gradient/)
  expect(styles).toMatch(/\.card:hover \.logo\.marked::before\s*\{[^}]*var\(--color-ink\)/)

  // Discovered by glob, so a renamed asset is a build error rather than a silent 404.
  expect(frontmatter).toMatch(/import\.meta\.glob<string>\('\.\.\/assets\/logos\/\*\.png'/)
  expect(markup).toMatch(/aria-hidden="true"/)
})
