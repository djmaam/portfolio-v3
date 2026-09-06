import { expect, test } from 'bun:test'

import { content, LANGS } from '../src/lib/content'
import { methodLabel, methodStep } from '../src/lib/motion/math'

/**
 * The pinned section is DOM plumbing over the math of `math.ts`, so — like the timeline
 * — what the unit tests guard is the shape of its source: the copy comes from
 * `content.json`, the five step hexes it carries never reach the output, the state is
 * the pure function the tests already cover, and nothing hides behind JavaScript.
 */
const source = await Bun.file(new URL('../src/components/Method.astro', import.meta.url)).text()
const [, frontmatter = '', body = ''] = /^---([\s\S]*?)^---([\s\S]*)$/m.exec(source) ?? []
/** What the server actually renders: the body without the client-side `<script>`. */
const markup = body.replace(/<script[\s\S]*?<\/script>/g, '')
const styles = /<style>([\s\S]*?)<\/style>/.exec(body)?.[1] ?? ''
const script = /<script>([\s\S]*?)<\/script>/.exec(body)?.[1] ?? ''

/** A comment ships nothing, so anything asserted about the code excludes the comments. */
const strip = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

/** The `{…}` that follows `header`, braces matched, so a nested rule cannot end it. */
const block = (css: string, header: string) => {
  const start = css.indexOf(header)
  if (start < 0) return ''
  let depth = 0
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1)
  }
  return ''
}

const PIN_QUERY = '@media (prefers-reduced-motion: no-preference) and (width >= 720px)'
/** The rules alone: a comment that names `280vh` must not pass for the rule itself. */
const css = strip(styles)

test('the five steps and their five verbs come from content.json in both languages', () => {
  for (const lang of LANGS) {
    const t = content[lang]
    expect(t.steps).toHaveLength(5)

    // `stepVerbs` is one pipe-separated string: a missing pipe would shift every label
    // by one and nothing else on the page would notice.
    const verbs = t.stepVerbs.split('|')
    expect(verbs).toHaveLength(5)
    for (const verb of verbs) expect(verb.trim()).toBe(verb)
    for (const verb of verbs) expect(verb.length).toBeGreaterThan(0)

    for (const step of t.steps) {
      expect(step.n.length).toBeGreaterThan(0)
      expect(step.h.length).toBeGreaterThan(0)
      expect(step.tool.length).toBeGreaterThan(0)
    }
  }

  // Rendered from the list, not transcribed.
  expect(frontmatter).toMatch(/from '\.\.\/lib\/content'/)
  expect(markup).toMatch(/t\.steps\.map\(/)
  for (const field of ['n', 'h', 'd', 'tool']) expect(markup).toContain(`step.${field}`)
  for (const key of ['secMethod', 'methodTitle', 'methodSub', 'cycleIdle']) {
    expect(markup).toContain(`t.${key}`)
  }
})

test('the component refuses to build if `stepVerbs` loses a pipe', () => {
  // The five labels are only ever right if the split yields one verb per step.
  expect(strip(frontmatter)).toMatch(/split\('\|'\)/)
  expect(strip(frontmatter)).toMatch(/length !== t\.steps\.length/)
  expect(strip(frontmatter)).toMatch(/throw new Error/)
})

test('the indicator text names the verb of the active step, in both languages', () => {
  for (const lang of LANGS) {
    const t = content[lang]
    const verbs = t.stepVerbs.split('|')

    for (let i = 0; i < verbs.length; i++) {
      const label = methodLabel(verbs, { active: i, done: false }, t.cycleIdle, t.cycleDone)
      expect(label).toBe(`${verbs[i]} · ${i + 1}/5`)
    }

    expect(methodLabel(verbs, methodStep(0), t.cycleIdle, t.cycleDone)).toBe(t.cycleIdle)
    expect(methodLabel(verbs, methodStep(1), t.cycleIdle, t.cycleDone)).toBe(t.cycleDone)
  }
})

test('the label walks the five verbs in order as the track scrolls, and back', () => {
  const t = content.es
  const verbs = t.stepVerbs.split('|')
  const labelAt = (p: number) => methodLabel(verbs, methodStep(p), t.cycleIdle, t.cycleDone)
  const samples = Array.from({ length: 101 }, (_, i) => i / 100)

  const seen = samples.map(labelAt)
  expect([...new Set(seen)]).toEqual([
    t.cycleIdle,
    ...verbs.map((verb, i) => `${verb} · ${i + 1}/5`),
    t.cycleDone,
  ])

  // Scrolling back up replays the same labels in reverse: no state is carried over.
  expect([...samples].reverse().map(labelAt).reverse()).toEqual(seen)
})

test('no copy is typed into the component', () => {
  const copy = LANGS.flatMap((lang) => {
    const t = content[lang]
    // `n` is left out on purpose: "02" is also the section number of the mono label,
    // which is a position on the page and not copy.
    return [
      t.secMethod,
      t.methodTitle,
      t.methodSub,
      t.cycleIdle,
      t.cycleDone,
      t.stepVerbs,
      ...t.stepVerbs.split('|'),
      ...t.steps.flatMap((step) => [step.h, step.d, step.tool]),
    ]
  })

  for (const text of copy) expect(strip(source)).not.toContain(text)
})

test('the five step colors are read from their tokens, never from content.json', () => {
  const hexes = new Set(LANGS.flatMap((lang) => content[lang].steps.map((step) => step.color)))
  expect(hexes.size).toBe(5)

  for (const hex of hexes) {
    expect(strip(source).toLowerCase()).not.toContain(hex.toLowerCase())
  }
  expect(strip(source)).not.toMatch(/step\.color/)

  // Index → token, so the traffic light lives in `app.css` alone.
  expect(markup).toMatch(/--color-step-\$\{index \+ 1\}/)
  expect(strip(script)).toMatch(/--color-step-\$\{/)
})

test('below 720px there is no sticky block and no 280vh track', () => {
  const pinned = block(css, PIN_QUERY)
  expect(pinned).toContain('280vh')
  expect(pinned).toContain('position: sticky')

  // Everything the pinning needs lives inside that one query — and behind `.has-js`,
  // so a page without JavaScript never gets a track it cannot advance.
  const rest = css.replace(pinned, '')
  expect(rest).not.toContain('280vh')
  expect(rest).not.toContain('sticky')
  for (const rule of pinned.split('\n').filter((line) => line.includes('.track'))) {
    expect(rule).toContain('html.has-js')
  }
})

test('the cards are legible with reduced motion and with JavaScript disabled', () => {
  // The dimmed resting state is the only thing that hides, and it hides only when JS
  // is there to walk it back and motion is welcome.
  const resting = block(css, '@media (prefers-reduced-motion: no-preference) {')
  expect(resting).toContain('0.22')
  expect(resting).toMatch(/html\.has-js[^{]*upcoming/)

  const rest = css.replace(block(css, PIN_QUERY), '').replace(resting, '')
  expect(rest).not.toMatch(/opacity:\s*0(\.\d+)?[;\s]/)
  expect(rest).not.toMatch(/display:\s*none/)
  expect(rest).not.toMatch(/visibility:\s*hidden/)

  // And the markup ships the steps in their upcoming state, so the first paint under
  // `.has-js` is the dimmed one instead of a flash of the whole track lit.
  expect(markup).toMatch(/data-state="upcoming"/)
})

test('the section drives itself off the shared scroll engine and the shared math', () => {
  expect(script).toMatch(/import \{ onScroll \} from '\.\.\/lib\/motion\/scroll'/)
  expect(script).toMatch(/methodProgress/)
  expect(script).toMatch(/methodStep/)
  expect(script).toMatch(/methodLabel/)
  expect(script).toMatch(/methodCardState/)

  // No listener of its own, in either direction, and no formula of its own: the two
  // constants of `MOTION_SPEC` §7 live in `math.ts` and nowhere else.
  expect(script).not.toMatch(/addEventListener\(/)
  expect(strip(script)).not.toContain('0.06')
  expect(strip(script)).not.toContain('0.84')
  expect(strip(script)).not.toContain('0.93')
})

test('the reveal is the shared one', () => {
  expect(markup).toMatch(/data-reveal/)
  // `bindReveals` runs once from Base for the whole page.
  expect(strip(script)).not.toContain('bindReveals')
  expect(strip(script)).not.toContain('IntersectionObserver')
})

test('both pages render the section at their method marker', async () => {
  for (const path of ['../src/pages/index.astro', '../src/pages/en/index.astro']) {
    const page = await Bun.file(new URL(path, import.meta.url)).text()
    expect(page).toMatch(/import Method from '[./]*components\/Method\.astro'/)
    expect(page).toMatch(/<Method lang=\{lang\} \/>/)
    expect(page).not.toContain('section-import: method')
    expect(page).not.toContain('{/* section: method */}')
  }
})
