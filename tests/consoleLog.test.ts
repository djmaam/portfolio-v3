import { afterEach, expect, test } from 'bun:test'

import { consoleLog } from '../src/lib/content'
import { MAX_LINES, onLogLine } from '../src/lib/motion/consoleLog'

type Tick = () => void

/**
 * The cycle is a timer plus a subscriber set, so the test owns the clock: `setInterval`
 * is stubbed and frames are drained by hand, which is what lets it assert both the order
 * of the messages and that the timer really stops with the last subscriber.
 */
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

/** The message the cycle emits for the nth line, counting the six already rendered. */
const message = (n: number) => {
  const [key, value] = consoleLog[(MAX_LINES + n) % consoleLog.length] as [string, string]
  return { key, value }
}

test('the cycle continues right after the six lines the markup already carries', () => {
  const dom = stub()
  const seen: unknown[] = []
  const stop = onLogLine((line) => seen.push(line))

  dom.advance(3)
  expect(seen).toEqual([message(0), message(1), message(2)])
  stop()
})

test('the cycle walks the eleven messages in order and wraps forever', () => {
  const dom = stub()
  const seen: unknown[] = []
  const stop = onLogLine((line) => seen.push(line))

  dom.advance(25)
  expect(seen).toEqual(Array.from({ length: 25 }, (_, n) => message(n)))
  // 25 lines over 11 messages: the source has looped past its end more than once.
  expect(seen).toHaveLength(25)
  expect(consoleLog).toHaveLength(11)
  stop()
})

test('every subscriber gets each line exactly once', () => {
  const dom = stub()
  const a: unknown[] = []
  const b: unknown[] = []
  const stopA = onLogLine((line) => a.push(line))
  const stopB = onLogLine((line) => b.push(line))

  dom.advance(4)
  expect(a).toHaveLength(4)
  expect(b).toEqual(a)
  expect(dom.count()).toBe(1)

  stopA()
  stopB()
})

test('the timer starts with the first subscriber and stops with the last one', () => {
  const dom = stub()
  expect(dom.count()).toBe(0)

  const stopA = onLogLine(() => {})
  const stopB = onLogLine(() => {})
  expect(dom.count()).toBe(1)

  stopA()
  expect(dom.count()).toBe(1)
  stopB()
  expect(dom.count()).toBe(0)
})

test('unsubscribing stops delivery to that subscriber alone', () => {
  const dom = stub()
  const a: unknown[] = []
  const b: unknown[] = []
  const stopA = onLogLine((line) => a.push(line))
  const stopB = onLogLine((line) => b.push(line))

  dom.advance(2)
  stopA()
  dom.advance(2)

  expect(a).toHaveLength(2)
  expect(b).toHaveLength(4)
  stopB()
})

test('the cycle runs fine with zero subscribers', () => {
  const dom = stub()
  const stop = onLogLine(() => {})
  stop()

  expect(dom.count()).toBe(0)
  expect(() => dom.advance(5)).not.toThrow()
  // A second unsubscribe is a no-op, the way `onScroll` behaves.
  expect(() => stop()).not.toThrow()
})

test('a new subscription restarts the cycle at the seventh message', () => {
  const dom = stub()
  const first: unknown[] = []
  const stopA = onLogLine((line) => first.push(line))
  dom.advance(3)
  stopA()

  const second: unknown[] = []
  const stopB = onLogLine((line) => second.push(line))
  dom.advance(3)
  expect(second).toEqual(first)
  stopB()
})

test('with prefers-reduced-motion: reduce no interval is ever started', () => {
  const dom = stub(true)
  const seen: unknown[] = []
  const stop = onLogLine((line) => seen.push(line))

  expect(dom.count()).toBe(0)
  dom.advance(5)
  expect(seen).toHaveLength(0)
  expect(() => stop()).not.toThrow()
})
