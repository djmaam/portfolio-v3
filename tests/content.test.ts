import { expect, test } from 'bun:test'

import raw from '../handoff/content.json'
import { consoleLog, content, LANGS, links, stack } from '../src/lib/content'
import type { Content } from '../src/lib/content'

/** Structural fingerprint: sorted keys, array lengths and primitive types, recursively. */
type Shape = string | Shape[] | { [key: string]: Shape }

const shapeOf = (value: unknown): Shape => {
  if (Array.isArray(value)) return value.map(shapeOf)
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, shapeOf(record[key])]),
    )
  }
  return typeof value
}

const stringsOf = (value: unknown, path: string): [string, string][] => {
  if (typeof value === 'string') return [[path, value]]
  if (Array.isArray(value)) return value.flatMap((item, i) => stringsOf(item, `${path}[${i}]`))
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => stringsOf(item, `${path}.${key}`))
  }
  return []
}

test('every language is exported', () => {
  expect([...LANGS]).toEqual(['es', 'en'])
  for (const lang of LANGS) expect(content[lang]).toBeDefined()
})

test('es and en share the same key set, recursively', () => {
  expect(shapeOf(content.en)).toEqual(shapeOf(content.es))
})

test('the repeated collections have the same length in both languages', () => {
  for (const key of ['jobs', 'projects', 'steps', 'principles'] as const) {
    expect(content.en[key].length).toBe(content.es[key].length)
  }
  expect(content.en.stepVerbs.split('|').length).toBe(content.es.stepVerbs.split('|').length)
})

test('no content string is empty or whitespace-only', () => {
  for (const lang of LANGS) {
    for (const [path, value] of stringsOf(content[lang], lang)) {
      expect(`${path}: ${JSON.stringify(value)}`).toBe(`${path}: ${JSON.stringify(value.trim())}`)
      expect(value.trim().length).toBeGreaterThan(0)
    }
  }
})

test('links, stack and consoleLog come straight from the JSON', () => {
  expect(links).toBe(raw.links)
  expect(stack).toBe(raw.stack)
  expect(consoleLog).toBe(raw.consoleLog)
})

test('Content is derived from the JSON, not hand-written', () => {
  // Compile-time: the exported type must be exactly `typeof raw['i18n']['es']`, so a new
  // key in content.json never needs a type edit. `tsc --noEmit` runs from `bun run lint`.
  type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
  const isDerived: Exact<Content, (typeof raw)['i18n']['es']> = true
  expect(isDerived).toBe(true)

  // Runtime shadow of the same rule: nothing is copied or remapped on the way out.
  expect(content.es).toBe(raw.i18n.es)
  expect(content.en).toBe(raw.i18n.en)
})
