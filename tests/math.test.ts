import { expect, test } from 'bun:test'

import {
  anchorOffset,
  auroraStyle,
  bootDelay,
  docProgress,
  scrambleFrame,
  typedLength,
} from '../src/lib/motion/math'

test('docProgress is 0 at the top of the document and 1 at the bottom', () => {
  expect(docProgress(0, 5000, 800)).toBe(0)
  expect(docProgress(4200, 5000, 800)).toBe(1)
  expect(docProgress(2100, 5000, 800)).toBeCloseTo(0.5, 10)
})

test('docProgress clamps beyond both ends', () => {
  expect(docProgress(-400, 5000, 800)).toBe(0)
  expect(docProgress(99999, 5000, 800)).toBe(1)
})

test('docProgress returns 0 when the document does not scroll', () => {
  expect(docProgress(0, 800, 800)).toBe(0)
  expect(docProgress(120, 800, 800)).toBe(0)
  // A shorter document than the viewport is the same non-scrolling case.
  expect(docProgress(120, 600, 800)).toBe(0)
})

test('auroraStyle at p=0 is the resting state of MOTION_SPEC §4', () => {
  const s = auroraStyle(0)
  expect(s.filter).toBe('hue-rotate(0deg) saturate(1)')
  expect(s.opacity).toBeCloseTo(0.45, 10)
  expect(s.translateY).toBe('0vh')
})

test('auroraStyle at p=.2 is halfway up the opacity ramp', () => {
  const s = auroraStyle(0.2)
  expect(s.filter).toBe('hue-rotate(52deg) saturate(1.08)')
  expect(s.opacity).toBeCloseTo(0.725, 10)
  expect(s.translateY).toBe('-2.4vh')
})

test('auroraStyle reaches opacity 1 at p=.4 and stays there', () => {
  expect(auroraStyle(0.4).opacity).toBeCloseTo(1, 10)
  expect(auroraStyle(0.4).filter).toBe('hue-rotate(104deg) saturate(1.16)')
  expect(auroraStyle(0.4).translateY).toBe('-4.8vh')
  for (const p of [0.5, 0.75, 1]) expect(auroraStyle(p).opacity).toBeCloseTo(1, 10)
})

test('auroraStyle at p=1 is the full hue rotation of MOTION_SPEC §4', () => {
  const s = auroraStyle(1)
  expect(s.filter).toBe('hue-rotate(260deg) saturate(1.4)')
  expect(s.opacity).toBeCloseTo(1, 10)
  expect(s.translateY).toBe('-12vh')
})

const GLYPHS = '<>/_-=+*#%&{}[]|\\01'
const BRAND = 'Marcos Arrieta'

/** Deterministic stand-in for Math.random: walks [0, 1) in coprime steps. */
const seeded = () => {
  let i = 0
  return () => ((i++ * 7) % 19) / 19
}

test('scrambleFrame keeps the length and the spaces of its target at every progress', () => {
  const spaces = [...BRAND].flatMap((char, index) => (char === ' ' ? [index] : []))
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    const frame = scrambleFrame(BRAND, p, seeded())
    expect(frame).toHaveLength(BRAND.length)
    expect([...frame].flatMap((char, index) => (char === ' ' ? [index] : []))).toEqual(spaces)
  }
})

test('scrambleFrame resolves to its target at p=1 and is all glyphs at p=0', () => {
  expect(scrambleFrame(BRAND, 1, seeded())).toBe(BRAND)
  for (const char of scrambleFrame(BRAND, 0, seeded())) {
    if (char !== ' ') expect(GLYPHS).toInclude(char)
  }
})

test('scrambleFrame resolves exactly floor(p² · len) characters, left to right', () => {
  // `<` is the first glyph of the pool and absent from the target, so with a `rand` that
  // always picks it the resolved prefix is whatever precedes the first `<`.
  const target = 'ORCHESTRATION'
  const first = () => 0
  let previous = -1
  for (let p = 0; p <= 1.0001; p += 0.05) {
    const frame = scrambleFrame(target, p, first)
    const n = Math.floor(p ** 2 * target.length)
    expect(frame.slice(0, n)).toBe(target.slice(0, n))
    expect(frame.slice(n)).toBe('<'.repeat(target.length - n))
    expect(n).toBeGreaterThanOrEqual(previous)
    previous = n
  }
})

test('scrambleFrame defaults to Math.random and stays inside the glyph pool', () => {
  const frame = scrambleFrame('abc', 0)
  expect(frame).toHaveLength(3)
  for (const char of frame) expect(GLYPHS).toInclude(char)
})

test('anchorOffset lands the target below the nav, and never above the document', () => {
  expect(anchorOffset(1200, 64)).toBe(1136)
  expect(anchorOffset(64, 64)).toBe(0)
  // `#top` reports a document top of 0, which is where it must land — never at -64.
  expect(anchorOffset(0, 64)).toBe(0)
  expect(anchorOffset(30, 64)).toBe(0)
})

test('bootDelay staggers the hero 170ms per step after a 500ms wait', () => {
  expect([0, 1, 2, 3, 4].map((n) => bootDelay(n))).toEqual([500, 670, 840, 1010, 1180])
  // The console's slot (issue 06) jumps to n=10, which is the 2200ms of MOTION_SPEC §2.
  expect(bootDelay(10)).toBe(2200)
})

test('typedLength shows nothing before the first character and clamps at the total', () => {
  expect(typedLength(-700, 28, 46)).toBe(0)
  expect(typedLength(0, 28, 46)).toBe(0)
  expect(typedLength(27, 28, 46)).toBe(0)
  expect(typedLength(46 * 28, 28, 46)).toBe(46)
  expect(typedLength(99999, 28, 46)).toBe(46)
})

test('typedLength advances exactly one character per perChar ms', () => {
  for (let n = 0; n <= 46; n++) {
    expect(typedLength(n * 28, 28, 46)).toBe(n)
    expect(typedLength(n * 28 + 27, 28, 46)).toBe(n)
  }
})
