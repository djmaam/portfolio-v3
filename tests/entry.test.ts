import { Glob } from 'bun'
import { expect, test } from 'bun:test'

import {
  consoleEntry,
  cloudFade,
  ENTRY_MS,
  ENTRY_REVEAL,
  energyParticle,
  entryDelay,
  entrySpan,
  markTransform,
  phaseAt,
  PHASES,
} from '../src/lib/motion/entry'
import { markPolygons, markSpin } from '../src/lib/motion/mark'

/**
 * The entry choreography (spec 31): six overlapping phases over 4.2 seconds, expressed as
 * fractions of the duration so one constant retimes all of it. Everything here is pure —
 * `entryDriver.ts` owns the canvas — which is what lets these tests pin the landing down
 * to the last bit, and the landing is the part that has to be exact.
 */

const D = ENTRY_MS
const VIEW = { w: 1440, h: 900 }
const NAV = { x: 42, y: 32, box: 20 }

test('the phase table is ordered and every pair of neighbors overlaps', () => {
  expect(PHASES.map((phase) => phase.name)).toEqual([
    'SEED',
    'EXPAND',
    'DOCK',
    'ENERGY',
    'CONSOLE',
    'CONTENT',
  ])

  PHASES.forEach((phase, i) => {
    expect(phase.from).toBeLessThan(phase.to)
    const next = PHASES[i + 1]
    if (!next) return
    expect(phase.from).toBeLessThan(next.from)
    // The overlap is the design: sequential phases came to 7.2s in the prototype.
    expect(phase.to).toBeGreaterThan(next.from)
  })

  expect(PHASES[0]!.from).toBe(0)
  expect(PHASES[PHASES.length - 1]!.to).toBe(1)
})

test('entrySpan scales linearly with the duration', () => {
  for (const phase of PHASES) {
    const single = entrySpan(phase.name, D)
    const double = entrySpan(phase.name, D * 2)
    expect(double.from).toBeCloseTo(single.from * 2, 10)
    expect(double.to).toBeCloseTo(single.to * 2, 10)
    expect(single.from).toBeCloseTo(phase.from * D, 10)
    expect(single.to).toBeCloseTo(phase.to * D, 10)
  }
})

test('phaseAt is 0 before its phase, 1 after it, and rises in between', () => {
  const { from, to } = entrySpan('DOCK', D)

  expect(phaseAt('DOCK', 0, D)).toBe(0)
  expect(phaseAt('DOCK', from, D)).toBe(0)
  expect(phaseAt('DOCK', to, D)).toBe(1)
  expect(phaseAt('DOCK', D, D)).toBe(1)
  expect(phaseAt('DOCK', (from + to) / 2, D)).toBeCloseTo(0.5, 10)

  let previous = -1
  for (let t = 0; t <= D; t += 20) {
    const p = phaseAt('DOCK', t, D)
    expect(p).toBeGreaterThanOrEqual(previous)
    previous = p
  }
})

test('markTransform starts collapsed at the center of the viewport', () => {
  const frame = markTransform(0, D, VIEW, NAV)

  expect(frame.expand).toBeCloseTo(0.08, 12)
  expect(frame.settle).toBe(0)
  expect(frame.center.x).toBeCloseTo(VIEW.w / 2, 12)
  expect(frame.center.y).toBeCloseTo(VIEW.h * 0.43, 12)
  // A point of light: a quarter of the settled size, at a third of its opacity.
  expect(frame.scale).toBeCloseTo(Math.min(VIEW.w, VIEW.h) * 0.19 * 0.85 * 0.25, 12)
  expect(frame.alpha).toBeCloseTo(0.35, 12)
})

test('markTransform lands on the nav slot', () => {
  const frame = markTransform(D, D, VIEW, NAV)

  expect(frame.expand).toBe(1)
  expect(frame.settle).toBe(1)
  expect(frame.alpha).toBe(1)
  expect(Math.abs(frame.center.x - NAV.x)).toBeLessThan(1e-9)
  expect(Math.abs(frame.center.y - NAV.y)).toBeLessThan(1e-9)
  expect(frame.scale).toBe(NAV.box)
})

test("the overlay's last frame is the nav canvas' frame", () => {
  // The defect this pins down survived fourteen commits in spec 30: an overlay that lands
  // one bit away from what `markDraw.ts` paints makes the mark jump the moment the overlay
  // is destroyed. Deep equality of the two arrays, not the contents of either.
  const frame = markTransform(D, D, VIEW, NAV)
  const overlay = markPolygons(frame.scale, frame.settle, D, frame.spinY, frame.expand)
  const nav = markPolygons(NAV.box, 1, D, markSpin(D))

  expect(overlay).toEqual(nav)
})

test('the cluster keeps turning through the flight and hands over in step', () => {
  // `spinY` is the mark's own idle turn plus the unwinding of the expansion, so at the end
  // of EXPAND it is exactly what the nav canvas would be showing at the same clock.
  const early = markTransform(0, D, VIEW, NAV)
  expect(early.spinY).toBeCloseTo(markSpin(0) + 2.4, 12)

  const settled = entrySpan('EXPAND', D).to
  expect(markTransform(settled, D, VIEW, NAV).spinY).toBeCloseTo(markSpin(settled), 12)
})

test('entryDelay is monotonic and the last reveal finishes inside the entry tail', () => {
  const delays = [0, 1, 2, 3, 4].map((n) => entryDelay(n, D))

  expect(delays).toEqual([...delays].sort((a, b) => a - b))
  expect(new Set(delays).size).toBe(delays.length)
  expect(delays[0]).toBeCloseTo(entrySpan('CONTENT', D).from, 10)
  expect(delays[4]! + ENTRY_REVEAL * D).toBeLessThanOrEqual(D + ENTRY_REVEAL * D)
  // Doubling the duration doubles the cascade with it, like every other span.
  expect(entryDelay(4, D * 2)).toBeCloseTo(entryDelay(4, D) * 2, 10)
})

test('energyParticle leaves the mark and lands on its node', () => {
  const from = { x: 60, y: 40 }
  const to = { x: 980, y: 520 }

  expect(energyParticle(from, to, 0, 0, VIEW.h)).toEqual(from)
  expect(energyParticle(from, to, 1, 0, VIEW.h)).toEqual(to)
  // Staggered particles still land: the delay only shortens the flight, it never clips it.
  expect(energyParticle(from, to, 1, 0.9, VIEW.h)).toEqual(to)
  expect(energyParticle(from, to, 0.2, 0.9, VIEW.h)).toEqual(from)

  for (let i = 0; i <= 200; i++) {
    const p = energyParticle(from, to, i / 200, 0.3, VIEW.h)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeLessThanOrEqual(VIEW.h)
    expect(p.x).toBeGreaterThanOrEqual(Math.min(from.x, to.x))
    expect(p.x).toBeLessThanOrEqual(Math.max(from.x, to.x))
  }

  // The arc: the particle falls out of the mark instead of sliding toward the cloud. `x`
  // is the straight interpolation, so it reads back the eased progress the arc lifts off.
  const mid = energyParticle(from, to, 0.15, 0, VIEW.h)
  const eased = (mid.x - from.x) / (to.x - from.x)
  expect(eased).toBeGreaterThan(0)
  expect(eased).toBeLessThan(1)
  expect(mid.y).toBeLessThan(from.y + (to.y - from.y) * eased)
})

test('consoleEntry holds the card until its phase and sweeps once inside it', () => {
  const { from, to } = entrySpan('CONSOLE', D)

  expect(consoleEntry(0, D)).toEqual({
    opacity: 0,
    translateY: 24,
    scale: 0.96,
    blur: 10,
    sweep: 0,
  })
  expect(consoleEntry(from, D).opacity).toBe(0)
  expect(consoleEntry(to, D)).toEqual({
    opacity: 1,
    translateY: 0,
    scale: 1,
    blur: 0,
    sweep: 1,
  })
  expect(consoleEntry(D, D).opacity).toBe(1)

  const sweepFrom = from + 0.35 * (to - from)
  expect(consoleEntry(sweepFrom, D).sweep).toBe(0)
  for (let t = sweepFrom + 1; t < to; t += 5) {
    const sweep = consoleEntry(t, D).sweep
    expect(sweep).toBeGreaterThan(0)
    expect(sweep).toBeLessThan(1)
  }
  expect(consoleEntry(D, D).sweep).toBe(1)
})

test('cloudFade brings the real cloud up over the energy phase', () => {
  const { from, to } = entrySpan('ENERGY', D)

  expect(cloudFade(0, D)).toBe(0)
  expect(cloudFade(from, D)).toBe(0)
  expect(cloudFade(to, D)).toBe(1)
  expect(cloudFade(D, D)).toBe(1)
  expect(cloudFade((from + to) / 2, D)).toBeGreaterThan(0.5)
})

/**
 * Criterion 13 of the spec. The ✳ formation is not deprecated, it is gone: the entry
 * expands the real mark where the cloud used to draw a glyph, and a leftover call site
 * would be a silent second choreography.
 */
test('nothing references the asterisk formation any more', async () => {
  const root = new URL('../', import.meta.url)
  const dead = /asteriskTarget|formationPhase|asteriskRadius/
  const holdouts: string[] = []

  for (const dir of ['src', 'tests', 'e2e']) {
    for await (const name of new Glob('**/*.{astro,ts,css}').scan(new URL(dir, root).pathname)) {
      const path = `${dir}/${name}`
      // This file names all three in the line above, which is the one exception.
      if (path === 'tests/entry.test.ts') continue
      if (dead.test(await Bun.file(new URL(path, root)).text())) holdouts.push(path)
    }
  }

  expect(holdouts).toEqual([])
})
