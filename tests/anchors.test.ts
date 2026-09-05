import { Glob } from 'bun'
import { expect, test } from 'bun:test'

/**
 * Anchor scrolling is DOM plumbing, so what the unit tests can guard is the invariant
 * that keeps it honest: exactly one delegated click handler in the whole source, and
 * exactly one place that binds it. Nav and the hero CTAs only carry `data-nav-link`.
 */
const src = new URL('../src/', import.meta.url)

const files = await Array.fromAsync(
  (async function* () {
    for await (const name of new Glob('**/*.{astro,ts}').scan(src.pathname)) {
      yield { name, text: await Bun.file(new URL(name, src)).text() }
    }
  })(),
)

/** Only the `<script>` bodies of an .astro file run: its markup carries the attribute. */
const code = ({ name, text }: { name: string; text: string }) =>
  name.endsWith('.astro')
    ? [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]).join('\n')
    : text

test('exactly one module registers the delegated anchor click handler', () => {
  const handlers = files.filter(
    (file) => /data-nav-link/.test(code(file)) && /addEventListener\(\s*'click'/.test(code(file)),
  )
  expect(handlers.map((file) => file.name)).toEqual(['lib/motion/anchors.ts'])
})

test('the handler is bound from exactly one place', () => {
  const callers = files.filter(
    (file) => file.name !== 'lib/motion/anchors.ts' && /bindAnchors\(\)/.test(code(file)),
  )
  expect(callers.map((file) => file.name)).toEqual(['layouts/Base.astro'])
})
