import { afterEach, expect, test } from 'bun:test'

import { scramble } from '../src/lib/motion/scramble'

type Frame = (now: number) => void

/**
 * The driver is pure DOM plumbing over `scrambleFrame`, so the test stubs the two globals
 * it touches: `requestAnimationFrame` (frames are drained by hand, with the clock the
 * test controls) and `matchMedia` (reduced motion).
 */
const stub = (reduceMotion = false) => {
  const frames: Frame[] = []
  let now = 0

  Object.assign(globalThis, {
    matchMedia: (query: string) => ({ matches: reduceMotion && query.includes('reduce') }),
    requestAnimationFrame: (fn: Frame) => frames.push(fn),
  })

  return {
    /** Advances the clock and runs the frames queued so far, like the browser would. */
    tick: (ms: number) => {
      now += ms
      for (const fn of frames.splice(0)) fn(now)
    },
    pending: () => frames.length,
  }
}

/** The three members of `HTMLElement` the driver reads or writes. */
const element = (text: string) =>
  ({ textContent: text, dataset: {} as Record<string, string> }) as unknown as HTMLElement

afterEach(() => {
  for (const key of ['matchMedia', 'requestAnimationFrame']) {
    delete (globalThis as Record<string, unknown>)[key]
  }
})

test('scramble leaves the text untouched with prefers-reduced-motion: reduce', () => {
  const clock = stub(true)
  const el = element('Marcos Arrieta')

  scramble(el, 900)

  expect(el.textContent).toBe('Marcos Arrieta')
  expect(clock.pending()).toBe(0)
})

test('scramble runs over its duration and ends on the resolved text', () => {
  const clock = stub()
  const el = element('Marcos Arrieta')

  scramble(el, 900)
  clock.tick(0) // First frame: the driver starts its clock and paints p=0.
  expect(el.textContent).toHaveLength('Marcos Arrieta'.length)
  expect(el.textContent).not.toBe('Marcos Arrieta')

  clock.tick(450)
  expect(clock.pending()).toBe(1)

  clock.tick(450)
  expect(el.textContent).toBe('Marcos Arrieta')
  expect(clock.pending()).toBe(0)
})

test('scramble replays from the resolved text, not from a half-scrambled frame', () => {
  const clock = stub()
  const el = element('Marcos Arrieta')

  scramble(el, 900)
  clock.tick(0)
  clock.tick(300)

  // A second run mid-flight (the 9s interval, or a hover) must still resolve to the brand.
  scramble(el, 700)
  clock.tick(1000)
  clock.tick(1000)
  expect(el.textContent).toBe('Marcos Arrieta')
})
