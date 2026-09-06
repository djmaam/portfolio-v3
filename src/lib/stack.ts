// Row grouping for the stack marquee (spec 22).
//
// `handoff/content.json` ships the 52 technologies as three rows of 17-18, and one half
// of each of those measures 1550 / 1485 / 1692px against the 1200px content column — so a
// row is always ~1.3 columns wide and any one technology is off screen for most of its
// loop. The rows the component renders are computed here instead: the same names, the
// same single `stack.core` highlight list, four rows that each fit the column.

/**
 * What Chromium renders for a chip at 12px mono: 24px of horizontal padding, 2px of
 * border and the 8px inline gap the chip carries — the gap lives on the chip and not on
 * the flex container, so that a track is exactly `2 × half` and `translateX(-50%)` lands
 * on the clone boundary — plus one 7.2px advance per character. Exact for a monospace
 * face, which is why this can be a pure function instead of a DOM measurement;
 * `tests/stackRows.test.ts` holds it to the numbers the browser reported.
 */
export function chipWidth(name: string): number {
  return 34 + 7.2 * name.length
}

const rowWidth = (row: string[]): number => row.reduce((total, name) => total + chipWidth(name), 0)

/**
 * Deal `names` into `count` rows, each name joining the narrowest row so far. Greedy
 * rather than an exact partition: on this content it lands every row within 5% of the
 * content column, and the test is what says so if the content changes.
 */
export function groupRows(names: string[], count: number): string[][] {
  const rows: string[][] = Array.from({ length: count }, () => [])
  for (const name of names) rows.reduce((a, b) => (rowWidth(a) <= rowWidth(b) ? a : b)).push(name)
  return rows
}
