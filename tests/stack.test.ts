import { expect, test } from 'bun:test'

import { content, LANGS, stack } from '../src/lib/content'
import { groupRows } from '../src/lib/stack'

const source = await Bun.file(new URL('../src/components/Stack.astro', import.meta.url)).text()
const [, frontmatter = '', body = ''] = /^---([\s\S]*?)^---([\s\S]*)$/m.exec(source) ?? []
const styles = /<style>([\s\S]*?)<\/style>/.exec(body)?.[1] ?? ''
/** What the server actually renders: the body without its scoped styles or comments. */
const markup = body.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

const names = stack.rows.flat()

/**
 * Content guard, not a markup one: `core` only highlights by name, so a name that
 * matches no row would be a typo nobody sees — the chip simply never lights up.
 */
test('every name in stack.core appears in some row of stack.rows', () => {
  const inRows = new Set(names)
  expect(stack.core.filter((name) => !inRows.has(name))).toEqual([])
  expect(stack.core).toHaveLength(20)
  expect(stack.rows.map((row) => row.length)).toEqual([17, 17, 18])
})

test('the highlight is derived from stack.core, with no second list in the component', () => {
  expect(frontmatter).toMatch(/\bstack\.core\b/)
  // `Astro.props` is the one place the string "Astro" may legitimately appear.
  const clean = source.replaceAll('Astro.props', '')
  for (const name of new Set(names)) expect(clean).not.toContain(name)
})

/**
 * Spec 22: `content.json` still ships 17 / 17 / 18 and stays read-only, and the component
 * regroups the same 52 names into four rows that each fit the content column. The
 * regrouping is `groupRows`, so nothing here may re-type a technology.
 */
test('the component renders four rows regrouped from stack.rows, not the three of content.json', () => {
  expect(frontmatter).toMatch(/groupRows\(stack\.rows\.flat\(\), (?:ROWS|4)\)/)
  expect(markup).not.toMatch(/stack\.rows\.map/)
  expect(groupRows(names, 4).flat().sort()).toEqual([...names].sort())
})

test('each row ships its items twice and only the clone is hidden from assistive tech', () => {
  // One template for both halves, so the copy the marquee loops on cannot drift from
  // the one the screen reader announces.
  expect(markup).toMatch(/rows\.map/)
  expect(markup).toMatch(/\[false, true\]\.map\(\(clone\)/)
  expect(markup).toMatch(/aria-hidden=\{clone \? 'true' : undefined\}/)
  expect([...markup.matchAll(/<ul class="half"/g)]).toHaveLength(1)
})

test('nothing in the section resembles a percentage bar', () => {
  // Rule 4 of `handoff/README.md`: zero skill percentages, ever.
  expect(source).not.toMatch(/<progress|<meter|progressbar|width:\s*\d+%/)
  expect(markup).not.toContain('%')
})

test('the marquee runs only with prefers-reduced-motion: no-preference', () => {
  const guard = styles.indexOf('@media (prefers-reduced-motion: no-preference)')
  expect(guard).toBeGreaterThan(-1)
  // With `reduce` the rows never animate, and the resting state is the legible one.
  expect(styles.indexOf('animation')).toBeGreaterThan(guard)
})

test('the four rows carry speeds of the MOTION_SPEC §10 family, alternating direction', () => {
  // §10 names three rows at 70 / 85 / 78s; spec 22 adds a fourth in the same family and
  // records the deviation. The alternation is what §10 is really about.
  expect(styles).toMatch(/nth-child\(1\)[\s\S]*?70s/)
  expect(styles).toMatch(/nth-child\(2\)[\s\S]*?85s/)
  expect(styles).toMatch(/nth-child\(3\)[\s\S]*?78s/)
  expect(styles).toMatch(/nth-child\(4\)[\s\S]*?8[0-5]s/)
  expect(styles).toMatch(/nth-child\(2\)[\s\S]*?animation-direction:\s*reverse/)
  expect(styles).toMatch(/nth-child\(4\)[\s\S]*?animation-direction:\s*reverse/)
  expect(styles).toMatch(/animation-timing-function:\s*linear|linear infinite/)
})

test('the stack column may be narrower than its content, which is what clips the marquee', () => {
  // The bug of spec 22: an `auto` grid column is sized to the max-content of its widest
  // item, and a `max-content` marquee track is 2.8 columns wide. `overflow: hidden` on
  // the row zeroes the automatic minimum but not that contribution, so the fix is here.
  expect(styles).toMatch(/\.stack\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/)
})

test('hover pauses the hovered row and only that one', () => {
  expect(styles).toMatch(/\.row:hover[^{]*\{[^}]*animation-play-state:\s*paused/)
  expect(styles).not.toMatch(/\.rows:hover/)
})

test('each row fades 8% at both edges and is revealed on its own', () => {
  expect(styles).toMatch(/mask-image:[^;]*\b8%/)
  expect([...markup.matchAll(/<div class="row" data-reveal>/g)]).toHaveLength(1)
})

test('chips are mono with an 8px radius, highlighted ones in accent', () => {
  expect(styles).toMatch(/\.chip\s*\{[\s\S]*?font-family:\s*var\(--font-mono\)/)
  expect(styles).toMatch(/\.chip\s*\{[\s\S]*?border-radius:\s*8px/)
  expect(styles).toMatch(/\.core\s*\{[\s\S]*?var\(--color-accent\)/)
})

test('every string comes from content.ts', () => {
  expect(frontmatter).toMatch(/from '\.\.\/lib\/content'/)
  for (const key of ['secStack', 'stackTitle', 'stackSub', 'stackCore', 'stackAlso']) {
    expect(markup).toContain(`t.${key}`)
  }
  for (const lang of LANGS) {
    for (const key of ['stackTitle', 'stackSub', 'stackCore', 'stackAlso'] as const) {
      expect(markup).not.toContain(content[lang][key])
    }
  }
})

test('the section is pure CSS: no script, and no listener of its own', () => {
  // `bindReveals` already runs once from `Base.astro`; the marquee needs no JavaScript.
  expect(source).not.toContain('<script')
  expect(source).not.toContain('addEventListener')
})

test('both pages render the section where their stack marker was', async () => {
  const pages = [
    ['../src/pages/index.astro', '..'],
    ['../src/pages/en/index.astro', '../..'],
  ] as const

  for (const [path, depth] of pages) {
    const page = await Bun.file(new URL(path, import.meta.url)).text()
    expect(page).toContain(`import Stack from '${depth}/components/Stack.astro'`)
    expect(page).toContain('<Stack lang={lang} />')
    expect(page).not.toContain('section-import: stack')
    expect(page).not.toContain('section: stack')

    // Only this section's own marker is asserted. Pinning the siblings' markers would
    // encode a transient state: each disappears as that section lands.
  }
})
