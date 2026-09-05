import { expect, test } from 'bun:test'

import { content, LANGS } from '../src/lib/content'
import { stats } from '../src/lib/ui'

/** `stats` is `as const`, so widening is what lets the literal be compared to a string. */
const companies: string = stats.companies

test('stats.companies matches the number of jobs in every language', () => {
  // Adding a company to the read-only content.json must fail here rather than leave the
  // hero claiming a number nothing backs.
  for (const lang of LANGS) expect(companies).toBe(String(content[lang].jobs.length))
})

test('the editorial stats are the numbers of the design', () => {
  expect(stats.years).toBe('8+')
  expect(stats.platforms).toBe('6')
})
