import { Glob } from 'bun'
import { expect, test } from 'bun:test'

import {
  buildMark,
  CUBE_FACES,
  DETAIL_MIN,
  HOVER_SETTLE,
  hoverSettle,
  idleWobble,
  ISO_TILT,
  MARK_FOCAL,
  markPieces,
  markPolygons,
  markScale,
  markSpin,
  pieceRotation,
  polyAlpha,
  rotate3,
  strokeWidth,
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

test('hoverSettle rests at 1 until something is hovered', () => {
  expect(hoverSettle(0, 12_345)).toBe(1)
})

test('hoverSettle dips on entry and eases back over 600ms', () => {
  expect(hoverSettle(1000, 1000)).toBeCloseTo(0.85, 10)
  expect(hoverSettle(1000, 1300)).toBeCloseTo(0.925, 10)
  expect(hoverSettle(1000, 1600)).toBe(1)
  expect(hoverSettle(1000, 60_000)).toBe(1)
})

test('hoverSettle stays inside its two bounds, even if the clock runs backwards', () => {
  for (let dt = -500; dt <= 1200; dt += 37) {
    const settle = hoverSettle(1000, 1000 + dt)
    expect(settle).toBeGreaterThanOrEqual(HOVER_SETTLE)
    expect(settle).toBeLessThanOrEqual(1)
  }
})

const REST = { settle: 1, t: 0, spin: Math.PI / 4 }

test('the polygons come back sorted back to front', () => {
  const depths = markPolygons(64, REST.settle, REST.t, REST.spin).map((poly) => poly.depth)
  expect([...depths].sort((a, b) => b - a)).toEqual(depths)
})

test('a panel is drawn before its own rules', () => {
  const polys = markPolygons(64, REST.settle, REST.t, REST.spin)
  const panel = polys.findIndex((poly) => poly.kind === 'panel')
  const rule = polys.findIndex((poly) => poly.kind === 'rule')
  expect(panel).toBeGreaterThanOrEqual(0)
  expect(rule).toBeGreaterThan(panel)
})

test('ticks and rules are two-point strokes; every face is a quad', () => {
  for (const poly of markPolygons(64, REST.settle, REST.t, REST.spin)) {
    const stroke = poly.kind === 'tick' || poly.kind === 'rule'
    expect(poly.points).toHaveLength(stroke ? 2 : 4)
  }
})

test('nothing is drawn outside its box, at any size or angle', () => {
  for (const box of [16, 20, 64, 240]) {
    for (const spin of [0, 1.4, Math.PI / 4, 5]) {
      for (const poly of markPolygons(box, 1, 5000, spin)) {
        for (const point of poly.points) {
          expect(point.x).toBeGreaterThanOrEqual(0)
          expect(point.x).toBeLessThanOrEqual(box)
          expect(point.y).toBeGreaterThanOrEqual(0)
          expect(point.y).toBeLessThanOrEqual(box)
        }
      }
    }
  }
})

test('the reduced set is framed larger, since it has no ticks to make room for', () => {
  expect(markScale(64, markPieces(16))).toBeGreaterThan(markScale(64, markPieces(64)))
})

test('the light theme lifts every alpha and never passes 1', () => {
  for (const poly of markPolygons(64, REST.settle, REST.t, REST.spin)) {
    const dark = polyAlpha(poly, false)
    const light = polyAlpha(poly, true)
    expect(light.stroke).toBeGreaterThanOrEqual(dark.stroke)
    expect(light.fill).toBeGreaterThanOrEqual(dark.fill)
    expect(light.stroke).toBeLessThanOrEqual(1)
    expect(light.fill).toBeLessThanOrEqual(1)
  }
})

test('strokes never fall below a hairline, and the core is the heaviest', () => {
  expect(strokeWidth('wire', 16)).toBeGreaterThanOrEqual(0.6)
  expect(strokeWidth('core', 240)).toBeGreaterThan(strokeWidth('wire', 240))
})

test('the global spin is monotonic and slow', () => {
  expect(markSpin(0)).toBe(0)
  expect(markSpin(1000)).toBeGreaterThan(markSpin(0))
  // A full turn takes about 22 seconds: peripheral, never a distraction.
  expect((Math.PI * 2) / markSpin(1)).toBeGreaterThan(20_000)
})

const src = new URL('../src/', import.meta.url)
const sources = await Array.fromAsync(
  (async function* () {
    for await (const name of new Glob('**/*.{astro,ts,css}').scan(src.pathname)) {
      yield { name, text: await Bun.file(new URL(name, src)).text() }
    }
  })(),
)

test('the asterisk is gone from the components', () => {
  // Only the components. `math.ts` and `network.ts` still name the glyph in comments
  // about the node cloud's ✳ formation (`MOTION_SPEC` §3), which is a live feature spec
  // 31 replaces — and `app.css` carries the same reference in a comment about its radius.
  const holdouts = sources.filter(
    (file) => file.name.startsWith('components/') && file.text.includes('✳'),
  )
  expect(holdouts.map((file) => file.name)).toEqual([])
})

test('the think keyframes are gone with it', () => {
  expect(sources.filter((file) => /@keyframes\s+think/.test(file.text))).toHaveLength(0)
  expect(sources.filter((file) => /animation:\s*think/.test(file.text))).toHaveLength(0)
})

test('the nav and the footer both mount the mark, at their own sizes', () => {
  const nav = sources.find((file) => file.name === 'components/Nav.astro')!.text
  const footer = sources.find((file) => file.name === 'components/Footer.astro')!.text
  expect(nav).toMatch(/<CubeMark size=\{20\} \/>/)
  expect(footer).toMatch(/<CubeMark size=\{16\} \/>/)
})

test('the mark is decoration, and ships in the markup rather than from a script', () => {
  const mark = sources.find((file) => file.name === 'components/CubeMark.astro')!.text
  expect(mark).toMatch(/aria-hidden="true"/)
  // The `<svg>` is emitted by the frontmatter: no JavaScript, no `has-js` gate, nothing
  // to wait for. Whatever script arrives later can only ever replace it.
  expect(mark).toMatch(/<svg[\s\S]*data-mark-svg/)
})
