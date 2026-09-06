import { afterEach, expect, test } from 'bun:test'

import { bindReveals } from '../src/lib/motion/reveal'

type Entry = { target: unknown; isIntersecting: boolean }
type Observed = { dataset: Record<string, string>; style: Record<string, string> }

class FakeObserver {
  observed: unknown[] = []
  unobserved: unknown[] = []
  disconnected = 0

  constructor(
    private callback: (entries: Entry[], observer: FakeObserver) => void,
    readonly options: IntersectionObserverInit,
  ) {}

  observe(target: unknown) {
    this.observed.push(target)
  }

  unobserve(target: unknown) {
    this.unobserved.push(target)
  }

  disconnect() {
    this.disconnected++
  }

  /** Delivers entries the way the browser would, from the observer's own callback. */
  fire(entries: Entry[]) {
    this.callback(entries, this)
  }
}

/**
 * `reveal.ts` is DOM plumbing, so the test stubs the two globals it touches:
 * `IntersectionObserver` — recorded, so both its options and its `unobserve` can be
 * asserted — and `matchMedia`. An element is the smallest thing the module reads: a
 * `dataset` and a `style`.
 */
const stub = (elements: Observed[], reduceMotion = false) => {
  const observers: FakeObserver[] = []

  Object.assign(globalThis, {
    IntersectionObserver: class extends FakeObserver {
      constructor(
        callback: (entries: Entry[], observer: FakeObserver) => void,
        options: IntersectionObserverInit,
      ) {
        super(callback, options)
        observers.push(this)
      }
    },
    document: { querySelectorAll: () => elements },
    matchMedia: (query: string) => ({ matches: reduceMotion && query.includes('reduce') }),
  })

  return observers
}

const element = (delay?: string): Observed => ({
  dataset: delay === undefined ? {} : { delay },
  style: {},
})

afterEach(() => {
  for (const key of ['IntersectionObserver', 'document', 'matchMedia']) {
    delete (globalThis as Record<string, unknown>)[key]
  }
})

test('with prefers-reduced-motion: reduce it returns a no-op and builds no observer', () => {
  const observers = stub([element()], true)

  const stop = bindReveals()

  expect(observers).toHaveLength(0)
  expect(() => stop()).not.toThrow()
})

test('the observer uses the thresholds of MOTION_SPEC §5', () => {
  const observers = stub([element(), element()])

  bindReveals()

  expect(observers).toHaveLength(1)
  expect(observers[0]!.options).toEqual({ threshold: 0.15, rootMargin: '0px 0px -8% 0px' })
  expect(observers[0]!.observed).toHaveLength(2)
})

test('an element is revealed and unobserved on its first intersection, so it fires once', () => {
  const target = element()
  const observers = stub([target])

  bindReveals()
  const observer = observers[0]!

  observer.fire([{ target, isIntersecting: false }])
  expect(target.style.opacity).toBeUndefined()
  expect(observer.unobserved).toHaveLength(0)

  observer.fire([{ target, isIntersecting: true }])
  expect(target.style.opacity).toBe('1')
  expect(target.style.transform).toBe('none')
  expect(target.style.filter).toBe('none')
  // Unobserved, which is what keeps the browser from ever delivering it a second time.
  expect(observer.unobserved).toEqual([target])
})

test('data-delay staggers the transition, and no attribute means no delay', () => {
  const staggered = element('220')
  const plain = element()
  const observers = stub([staggered, plain])

  bindReveals()
  observers[0]!.fire([
    { target: staggered, isIntersecting: true },
    { target: plain, isIntersecting: true },
  ])

  expect(staggered.style.transitionDelay).toBe('220ms')
  expect(plain.style.transitionDelay).toBe('0ms')
})

test('the returned stop disconnects the observer', () => {
  const observers = stub([element()])

  bindReveals()()

  expect(observers[0]!.disconnected).toBe(1)
})
