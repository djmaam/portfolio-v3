import { expect, test } from 'bun:test'

import {
  buildMark,
  CUBE_FACES,
  DETAIL_MIN,
  idleWobble,
  ISO_TILT,
  MARK_FOCAL,
  markPieces,
  pieceRotation,
  rotate3,
  visibleFaces,
} from '../src/lib/motion/mark'

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

test('at rest every piece is flush with the lattice', () => {
  for (const piece of buildMark()) {
    const rest = pieceRotation(piece, 1)
    for (const angle of [rest.x, rest.y, rest.z]) {
      const quarters = angle / (Math.PI / 2)
      expect(Math.abs(quarters - Math.round(quarters))).toBeLessThan(1e-9)
    }
  }
})

test('unsettled, a piece is turned by whole revolutions', () => {
  const core = buildMark()[0]!
  const turned = pieceRotation(core, 0)
  expect(turned.x).toBeCloseTo(core.orient.x + core.turns.x * Math.PI * 2, 10)
  expect(turned.y).toBeCloseTo(core.orient.y + core.turns.y * Math.PI * 2, 10)
})

test('the idle wobble only exists once the piece has settled, and stays under 0.1 rad', () => {
  const core = buildMark()[0]!
  expect(idleWobble(core, 1234, 0)).toEqual({ x: 0, y: 0, z: 0 })
  expect(Math.abs(idleWobble(core, 1234, 1).x)).toBeLessThanOrEqual(0.1)
  expect(idleWobble(core, 0, 1)).not.toEqual(idleWobble(core, 3000, 1))
})

test('rotate3 preserves length', () => {
  const rotated = rotate3({ x: 1, y: 2, z: 3 }, { x: 0.3, y: -1.1, z: 0.7 })
  expect(Math.hypot(rotated.x, rotated.y, rotated.z)).toBeCloseTo(Math.hypot(1, 2, 3), 10)
})

test('an isometric cube shows exactly three of its six faces', () => {
  // Deriving the normal from the vertex winding does not work here: `CUBE_FACES` is not
  // consistently wound, and culling on it renders the cubes open-topped.
  const cam = { world: { x: ISO_TILT, y: Math.PI / 4, z: 0 }, f: MARK_FOCAL }
  expect(visibleFaces({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0.3, cam)).toHaveLength(3)
  expect(visibleFaces({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0.46, cam)).toHaveLength(3)
})

test('a cube seen head on shows only the face pointing at the camera', () => {
  const cam = { world: { x: 0, y: 0, z: 0 }, f: MARK_FOCAL }
  expect(visibleFaces({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1, cam)).toEqual([0])
})

test('every face index a cull returns is a real face', () => {
  const cam = { world: { x: ISO_TILT, y: 1.4, z: 0 }, f: MARK_FOCAL }
  for (const piece of markPieces(64)) {
    if (piece.kind === 'panel' || piece.kind === 'tick') continue
    for (const face of visibleFaces(piece.pos, pieceRotation(piece, 1), piece.size, cam)) {
      expect(CUBE_FACES[face]).toBeDefined()
    }
  }
})
