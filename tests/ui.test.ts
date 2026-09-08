import { expect, test } from 'bun:test'

import { content, LANGS } from '../src/lib/content'
import { stats } from '../src/lib/ui'

/** `stats` is `as const`, so widening is what lets the literal be compared to a string. */
const products: string = stats.products

test('stats.products is not below the projects the site can show', () => {
  // The claim is "10+ products in production" and six of them are linkable cards: if the
  // project list ever grows past the claim, the hero is the thing that has to move.
  for (const lang of LANGS)
    expect(Number(products.replace('+', ''))).toBeGreaterThanOrEqual(content[lang].projects.length)
})

test('the editorial stats are the numbers of the design', () => {
  expect(stats.years).toBe('7+')
  expect(stats.platforms).toBe('6')
})
