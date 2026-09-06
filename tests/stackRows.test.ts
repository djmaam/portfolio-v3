import { expect, test } from 'bun:test'

import { stack } from '../src/lib/content'
import { chipWidth, groupRows } from '../src/lib/stack'

const names = stack.rows.flat()
const width = (row: string[]) => row.reduce((total, name) => total + chipWidth(name), 0)

/** The content column of `container-page` at a 1512px viewport (spec 19). */
const COLUMN = 1200

/**
 * The model behind the grouping. A 12px monospace chip is a constant (padding, border and
 * the 8px inline gap the marquee keeps on the chip) plus one advance per character, so a
 * character count is an exact stand-in for a layout engine here. Measured in Chromium:
 * `Go` 48.4px, `TypeScript` 106.0px, `Spec-Driven Development` 199.6px.
 */
test('chipWidth reproduces what Chromium renders for a 12px mono chip', () => {
  expect(chipWidth('Go')).toBeCloseTo(48.4, 1)
  expect(chipWidth('TypeScript')).toBeCloseTo(106.0, 1)
  expect(chipWidth('Spec-Driven Development')).toBeCloseTo(199.6, 1)
})

test('every technology lands in exactly one row', () => {
  const rows = groupRows(names, 4)
  expect(rows).toHaveLength(4)
  // Sorted, so the grouping is free to reorder but not to drop or duplicate.
  expect(rows.flat().sort()).toEqual([...names].sort())
})

test('the four rows are each within 5% of the content column', () => {
  // This is the whole point of the deviation from the handoff's three rows (spec 22):
  // one half is the visible column, so a row reads at a glance instead of scrolling
  // 1.3 columns of chips past the viewport.
  for (const row of groupRows(names, 4)) {
    expect(width(row)).toBeGreaterThan(COLUMN * 0.9)
    expect(width(row)).toBeLessThan(COLUMN * 1.05)
  }
})

test('the balance survives the longest name arriving last', () => {
  // The greedy is order-dependent, and the worst order saves the widest chip for the end.
  // Its guarantee is one chip: a row only grows while it is the narrowest, so no row can
  // end more than the widest chip above another. Assert that bound, in the worst order —
  // the production order is the 5% one above.
  const widest = Math.max(...names.map(chipWidth))
  const worst = [...names].sort((a, b) => a.length - b.length)
  const widths = groupRows(worst, 4).map(width)
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(widest)
})
