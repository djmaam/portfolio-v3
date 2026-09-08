import { expect, test } from 'bun:test'

import { LANGS } from '../src/lib/content'
import { DEFAULT_LANG, langFromPath, siblingPath } from '../src/lib/i18n'

test('the default language is Spanish', () => {
  expect(DEFAULT_LANG).toBe('es')
})

test('langFromPath resolves both routes, the trailing slash and unknown paths', () => {
  expect(langFromPath('/')).toBe('es')
  expect(langFromPath('/en')).toBe('en')
  expect(langFromPath('/en/')).toBe('en')
  expect(langFromPath('/en/anything')).toBe('en')
  expect(langFromPath('/endgame')).toBe('es')
  expect(langFromPath('/unknown')).toBe(DEFAULT_LANG)
  expect(langFromPath('')).toBe(DEFAULT_LANG)
})

test('siblingPath swaps the language prefix', () => {
  expect(siblingPath('/', 'en')).toBe('/en')
  expect(siblingPath('/en', 'es')).toBe('/')
  expect(siblingPath('/en/', 'es')).toBe('/')
  expect(siblingPath('/en/anything', 'es')).toBe('/anything')
  expect(siblingPath('/anything', 'en')).toBe('/en/anything')
})

// `build.format: 'file'` is what makes `/en` serve without a 308 on Cloudflare Pages,
// and it is also what puts the built file name into `Astro.url.pathname`. Both callers
// pass that pathname straight in, so the canonical of every page depends on this.
test('siblingPath recovers the route from the file `format: file` builds', () => {
  expect(siblingPath('/index.html', 'es')).toBe('/')
  expect(siblingPath('/index.html', 'en')).toBe('/en')
  expect(siblingPath('/en/en.html', 'en')).toBe('/en')
  expect(siblingPath('/en/en.html', 'es')).toBe('/')
})

test('siblingPath is a no-op when the target language is already the current one', () => {
  expect(siblingPath('/', 'es')).toBe('/')
  expect(siblingPath('/en', 'en')).toBe('/en')
})

test('siblingPath round-trips on both routes', () => {
  for (const path of ['/', '/en']) {
    const from = langFromPath(path)
    const to = LANGS.find((lang) => lang !== from)!
    expect(siblingPath(siblingPath(path, to), from)).toBe(path)
  }
})
