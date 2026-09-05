import { expect, test } from 'bun:test'

const root = new URL('../', import.meta.url)
const astroConfig = await Bun.file(new URL('astro.config.mjs', root)).text()
const pkg = await Bun.file(new URL('package.json', root)).json()

test('astro.config.mjs declares static output', () => {
  expect(astroConfig).toMatch(/output:\s*['"]static['"]/)
})

test('package.json exposes every script the workflow depends on', () => {
  const scripts = ['dev', 'build', 'preview', 'lint', 'format', 'test']
  expect(Object.keys(pkg.scripts as Record<string, string>).sort()).toEqual(scripts.sort())
})
