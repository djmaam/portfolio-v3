import { afterEach, expect, test } from 'bun:test'

import { asciimojiAt, MOJI, MOJI_INTERVAL_MS, rotateMoji } from '../src/lib/asciimoji'

type Tick = () => void

/**
 * The faces are read back from `MOTION_SPEC` §12 instead of being retyped here: several
 * of them carry combining marks and backslashes, so a copy by hand is exactly the kind
 * of thing that rots silently. The spec section is the fixture.
 */
const motionSpec = await Bun.file(new URL('../handoff/MOTION_SPEC.md', import.meta.url)).text()
const specFaces = [
  ...(/## 12\. Footer([\s\S]*?)## 13/.exec(motionSpec)?.[1] ?? '').matchAll(/`([^`]+)`/g),
]
  .map((match) => match[1] ?? '')
  .filter((code) => code !== 'think' && !code.includes('min-width'))

test('the faces are the fifteen of MOTION_SPEC §12, in order', () => {
  expect(specFaces).toHaveLength(15)
  expect([...MOJI]).toEqual(specFaces)
})

test('asciimojiAt walks the fifteen faces in order and wraps forever', () => {
  expect(Array.from({ length: 15 }, (_, tick) => asciimojiAt(tick))).toEqual([...MOJI])
  expect(asciimojiAt(15)).toBe(MOJI[0])
  expect(asciimojiAt(16)).toBe(MOJI[1])
  expect(asciimojiAt(37)).toBe(MOJI[7])
})

/** The rotation is a single timer, so the test owns the clock the way `consoleLog` does. */
const timers = { setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval }

const stub = (reduceMotion = false) => {
  const intervals = new Map<number, Tick>()
  let id = 0

  Object.assign(globalThis, {
    matchMedia: (query: string) => ({ matches: reduceMotion && query.includes('reduce') }),
    setInterval: (fn: Tick) => {
      intervals.set(++id, fn)
      return id
    },
    clearInterval: (handle: number) => intervals.delete(handle),
  })

  return {
    count: () => intervals.size,
    advance: (ticks = 1) => {
      for (let i = 0; i < ticks; i++) for (const fn of [...intervals.values()]) fn()
    },
  }
}

afterEach(() => {
  Object.assign(globalThis, timers)
  delete (globalThis as Record<string, unknown>).matchMedia
})

test('the rotation starts at the second face and keeps cycling', () => {
  const dom = stub()
  const seen: string[] = []
  rotateMoji((face) => seen.push(face))

  expect(dom.count()).toBe(1)
  dom.advance(17)
  // The first face is already in the markup, so the timer continues from the second one.
  expect(seen).toEqual(Array.from({ length: 17 }, (_, n) => asciimojiAt(n + 1)))
  expect(MOJI_INTERVAL_MS).toBe(1000)
})

test('with prefers-reduced-motion: reduce no interval is ever started', () => {
  const dom = stub(true)
  const seen: string[] = []
  rotateMoji((face) => seen.push(face))

  expect(dom.count()).toBe(0)
  dom.advance(5)
  expect(seen).toHaveLength(0)
})

/**
 * The rest is DOM plumbing, so what is guarded is the shape of the markup: the footer
 * has to read complete without JavaScript, announce none of its decoration, and carry no
 * copy of its own.
 */
const source = await Bun.file(new URL('../src/components/Footer.astro', import.meta.url)).text()
const [, frontmatter = '', body = ''] = /^---([\s\S]*?)^---([\s\S]*)$/m.exec(source) ?? []
/** What the server actually renders: the body without the client-side `<script>`. */
const markup = body.replace(/<script[\s\S]*?<\/script>/g, '')

test('the year comes from the build date, not from a literal', () => {
  expect(frontmatter).toMatch(/new Date\(\)\.getFullYear\(\)/)
  expect(markup).not.toMatch(/\b20\d\d\b/)
})

test('the decoration is hidden from assistive technology', () => {
  expect(markup).toMatch(/<CubeMark size=\{16\} \/>/)
  // One `aria-hidden` on the wrapper covers the live face and the fifteen sizers alike.
  expect(markup).toMatch(/<span class="moji" aria-hidden="true">/)
})

test('one face is server-rendered, so the footer is complete without JavaScript', () => {
  expect(markup).toMatch(/<span data-moji>\{MOJI\[0\]\}<\/span>/)
})

test('the ASCIImoji reserves its width so the rotation never shifts the layout', () => {
  expect(source).toMatch(/min-width:\s*9ch/)
  // The faces fall back out of the mono font and vary from 39px to 109px, so `9ch` alone
  // would let the line jump every second: the other faces ship as invisible sizers.
  expect(markup).toMatch(
    /MOJI\.slice\(1\)\.map\(\(face\) => <span class="ghost">\{face\}<\/span>\)/,
  )
  expect(source).toMatch(/\.ghost \{\s*visibility: hidden;/)
})

test('every string comes from content.ts', () => {
  expect(frontmatter).toMatch(/from '\.\.\/lib\/content'/)
  expect(markup).toMatch(/t\.footerSig/)
  expect(markup).toMatch(/site\.name/)
  expect(markup).toMatch(/site\.handle/)
  expect(markup).not.toContain('Marcos Arrieta')
  expect(markup).not.toContain('@djmaam')
  expect(markup).not.toContain('agentes')
})

test('Base renders the footer itself, so the pages stay untouched', async () => {
  const base = await Bun.file(new URL('../src/layouts/Base.astro', import.meta.url)).text()
  expect(base).toMatch(/import Footer from '\.\.\/components\/Footer\.astro'/)
  expect(base).toMatch(/<Footer lang=\{lang\} \/>/)
})
