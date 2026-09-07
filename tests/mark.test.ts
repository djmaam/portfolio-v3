import { expect, test } from 'bun:test'

import { buildMark, DETAIL_MIN, markPieces } from '../src/lib/motion/mark'

/**
 * The mark is a 3×3×3 lattice read isometrically (spec 30). Its arrangement comes from a
 * seeded LCG, not from `Math.random`: Astro projects the same pieces at build time that
 * the canvas projects at runtime, and any divergence is a visible jump when the canvas
 * mounts. These tests are what pins the arrangement down.
 */

test('the arrangement is deterministic', () => {
  expect(buildMark()).toEqual(buildMark())
})

test('thirty-five pieces at full detail, seventeen below the threshold', () => {
  expect(buildMark()).toHaveLength(35)
  expect(markPieces(DETAIL_MIN)).toHaveLength(35)
  expect(markPieces(DETAIL_MIN - 1)).toHaveLength(17)
})

test('the reduced set is the one that drops ticks, panels and corner cubes', () => {
  const reduced = markPieces(16)
  expect(reduced.some((piece) => piece.kind === 'tick')).toBe(false)
  expect(reduced.some((piece) => piece.kind === 'panel')).toBe(false)
  const corners = reduced.filter(
    (piece) => [piece.pos.x, piece.pos.y, piece.pos.z].filter((v) => v !== 0).length === 3,
  )
  expect(corners).toHaveLength(0)
})

test('the cubes stay on the lattice and every panel sits at 1.8 on one axis', () => {
  for (const piece of buildMark()) {
    if (piece.kind === 'tick') continue
    const coords = [piece.pos.x, piece.pos.y, piece.pos.z]
    if (piece.kind === 'panel') {
      expect(coords.filter((v) => Math.abs(v) === 1.8)).toHaveLength(1)
      expect(coords.filter((v) => v === 0)).toHaveLength(2)
    } else {
      expect(Math.max(...coords.map((v) => Math.abs(v)))).toBeLessThanOrEqual(1)
    }
  }
})

test('only the panels carry code rules', () => {
  for (const piece of buildMark()) {
    expect(piece.rules).toHaveLength(piece.kind === 'panel' ? 6 : 0)
  }
})

test('every piece turns a whole number of times on each axis', () => {
  for (const piece of buildMark()) {
    for (const turns of [piece.turns.x, piece.turns.y, piece.turns.z]) {
      expect(Number.isInteger(turns)).toBe(true)
      expect(Math.abs(turns)).toBeLessThanOrEqual(2)
    }
  }
})
