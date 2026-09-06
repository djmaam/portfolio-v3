import { Glob } from 'bun'
import { afterEach, expect, test } from 'bun:test'

import { mountNetwork } from '../src/lib/motion/network'

const root = new URL('../', import.meta.url)
const src = new URL('src/', root)
const sources = await Array.fromAsync(
  (async function* () {
    for await (const name of new Glob('**/*.{astro,ts}').scan(src.pathname)) {
      yield { name, text: await Bun.file(new URL(name, src)).text() }
    }
  })(),
)
const network = await Bun.file(new URL('lib/motion/network.ts', src)).text()
const css = await Bun.file(new URL('styles/app.css', src)).text()
const hero = await Bun.file(new URL('components/Hero.astro', src)).text()

test('exactly one module attaches a resize listener', () => {
  // The canvas resizes off the `vh` the scroll engine already publishes: a `resize`
  // listener of its own would be a second layout read per frame (`MOTION_SPEC` §13).
  const attachers = sources.filter((file) => /addEventListener\(\s*'resize'/.test(file.text))
  expect(attachers.map((file) => file.name)).toEqual(['lib/motion/scroll.ts'])
})

test('the network subscribes to the shared scroll engine', () => {
  expect(network).toMatch(/from '\.\/scroll'/)
  expect(network).not.toMatch(/ResizeObserver/)
})

test('no canvas is ever server-rendered', () => {
  // The element is created by the client script and only when motion is welcome, which
  // is what covers both the no-JS case and `prefers-reduced-motion: reduce`.
  expect(hero.replace(/<script[\s\S]*?<\/script>/g, '')).not.toMatch(/<canvas/i)
})

test('the canvas is decoration: hidden from the tree and deaf to the pointer', () => {
  expect(network).toMatch(/aria-hidden/)
  const rule = /\.hero-net\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  expect(rule).toMatch(/pointer-events:\s*none/)
  expect(rule).toMatch(/position:\s*absolute/)
  // Behind the hero text, above the aurora — and never a negative z-index (spec 07).
  expect(rule).toMatch(/z-index:\s*0/)
  expect(rule).toMatch(/mask-image:\s*linear-gradient\(180deg/)
})

test('the canvas is the viewport box of MOTION_SPEC §3, not the hero box', () => {
  // "Canvas absoluto, 100vw × 100vh". Sizing it off `.hero` instead makes `ry = .48h`,
  // the ✳ radius and the 55% mask cut all follow a section that re-flows — and `--nav-h`
  // is what lifts it back to the top of the page, where the mock puts it.
  const rule = /\.hero-net\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  expect(rule).toMatch(/height:\s*100vh/)
  expect(rule).toMatch(/top:\s*calc\(-1 \* var\(--nav-h\)\)/)
  expect(rule).not.toMatch(/inset:\s*0/)

  // And the card is read into the canvas' own coordinates, not the section's, which is
  // the half of the change that lives in the script.
  expect(network).toMatch(/canvas\.offsetTop/)
  // The canvas' size no longer moves when the hero re-flows, so the cached card would
  // miss a font swap without this.
  expect(network).toMatch(/fonts\?\.ready|fonts\.ready/)
})

test('the canvas paints in the theme colors, read from the tokens', () => {
  // No hex anywhere in the class: it reads the resolved tokens off its own computed
  // style, so flipping the theme repaints it in the right accent.
  expect(network).toMatch(/getComputedStyle/)
  const rule = /\.hero-net\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  expect(rule).toMatch(/color:\s*var\(--color-accent\)/)
  expect(rule).toMatch(/border-color:\s*var\(--color-violet\)/)
})

test('the cursor is detected by pointer type, never by the user agent', () => {
  expect(network).toMatch(/pointerType/)
  expect(network).not.toMatch(/userAgent|navigator\.platform|ontouchstart/)
})

afterEach(() => {
  for (const key of ['matchMedia', 'document']) {
    delete (globalThis as Record<string, unknown>)[key]
  }
})

test('with prefers-reduced-motion: reduce nothing is created at all', () => {
  const created: string[] = []
  const appended: unknown[] = []
  Object.assign(globalThis, {
    matchMedia: (query: string) => ({ matches: query.includes('reduce') }),
    document: {
      documentElement: { dataset: {} },
      createElement: (tag: string) => {
        created.push(tag)
        return {}
      },
    },
  })

  const section = { append: (node: unknown) => appended.push(node) } as unknown as HTMLElement
  const stop = mountNetwork(section, {} as unknown as HTMLElement)

  expect(created).toEqual([])
  expect(appended).toEqual([])
  expect(() => stop()).not.toThrow()
})
