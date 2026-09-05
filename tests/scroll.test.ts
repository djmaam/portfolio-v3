import { Glob } from 'bun'
import { afterEach, expect, test } from 'bun:test'

import { onScroll } from '../src/lib/motion/scroll'

type Listener = () => void

const src = new URL('../src/', import.meta.url)
const sources = await Array.fromAsync(
  (async function* () {
    for await (const name of new Glob('**/*.{astro,ts}').scan(src.pathname)) {
      yield { name, text: await Bun.file(new URL(name, src)).text() }
    }
  })(),
)

test('exactly one module attaches a scroll listener', () => {
  // Every new block subscribes through `onScroll`; a second listener anywhere is the
  // regression this guards (`MOTION_SPEC` §13).
  const attachers = sources.filter((file) => /addEventListener\(\s*'scroll'/.test(file.text))
  expect(attachers.map((file) => file.name)).toEqual(['lib/motion/scroll.ts'])
})

/**
 * The site's scroll engine is pure DOM plumbing, so the test stubs the three globals it
 * touches: `window` (listeners + rAF + metrics), `document` (scrollHeight) and
 * `matchMedia` (reduced motion). Frames are drained by hand, which is what lets the test
 * fire a burst of events against a single tick.
 */
const stub = (reduceMotion = false) => {
  const listeners = new Map<string, Set<Listener>>()
  const frames: Listener[] = []

  const win = {
    scrollY: 0,
    innerHeight: 800,
    addEventListener(type: string, fn: Listener) {
      const set = listeners.get(type) ?? new Set<Listener>()
      set.add(fn)
      listeners.set(type, set)
    },
    removeEventListener(type: string, fn: Listener) {
      listeners.get(type)?.delete(fn)
    },
    requestAnimationFrame(fn: Listener) {
      frames.push(fn)
      return frames.length
    },
    cancelAnimationFrame() {},
  }

  Object.assign(globalThis, {
    window: win,
    document: { documentElement: { scrollHeight: 5000 } },
    matchMedia: (query: string) => ({ matches: reduceMotion && query.includes('reduce') }),
  })

  return {
    win,
    count: (type: string) => listeners.get(type)?.size ?? 0,
    fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
    /** Runs every frame queued so far, the way the browser would on the next tick. */
    flush: () => frames.splice(0).forEach((fn) => fn()),
  }
}

afterEach(() => {
  for (const key of ['window', 'document', 'matchMedia']) {
    delete (globalThis as Record<string, unknown>)[key]
  }
})

test('subscribers run once per frame, not once per event', () => {
  const dom = stub()
  const calls: number[] = []
  const stop = onScroll((state) => calls.push(state.scrollY))

  dom.win.scrollY = 2100
  for (let i = 0; i < 5; i++) dom.fire('scroll')
  dom.flush()

  expect(calls).toEqual([2100])
  stop()
})

test('every subscriber gets the same state, computed once per frame', () => {
  const dom = stub()
  const seen: unknown[] = []
  const stopA = onScroll((state) => seen.push(state))
  const stopB = onScroll((state) => seen.push(state))

  dom.win.scrollY = 4200
  dom.fire('scroll')
  dom.flush()

  expect(seen).toHaveLength(2)
  expect(seen[0]).toBe(seen[1])
  expect(seen[0]).toEqual({ scrollY: 4200, vh: 800, progress: 1 })
  stopA()
  stopB()
})

test('a resize refreshes the viewport height', () => {
  const dom = stub()
  const seen: number[] = []
  const stop = onScroll((state) => seen.push(state.vh))

  dom.win.innerHeight = 600
  dom.fire('resize')
  dom.flush()

  expect(seen.at(-1)).toBe(600)
  stop()
})

test('the listener attaches on the first subscription and detaches with the last one', () => {
  const dom = stub()
  expect(dom.count('scroll')).toBe(0)

  const stopA = onScroll(() => {})
  const stopB = onScroll(() => {})
  expect(dom.count('scroll')).toBe(1)
  expect(dom.count('resize')).toBe(1)

  stopA()
  expect(dom.count('scroll')).toBe(1)

  stopB()
  expect(dom.count('scroll')).toBe(0)
  expect(dom.count('resize')).toBe(0)

  onScroll(() => {})()
  expect(dom.count('scroll')).toBe(0)
  const stopC = onScroll(() => {})
  expect(dom.count('scroll')).toBe(1)
  stopC()
})

test('with prefers-reduced-motion: reduce it never attaches a listener', () => {
  const dom = stub(true)
  const calls: unknown[] = []
  const stop = onScroll((state) => calls.push(state))

  expect(dom.count('scroll')).toBe(0)
  expect(dom.count('resize')).toBe(0)
  dom.fire('scroll')
  dom.flush()
  expect(calls).toHaveLength(0)

  expect(() => stop()).not.toThrow()
})
