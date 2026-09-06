import { expect, test } from 'bun:test'

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
