import { lerp } from './math'
import type { Point, Point3 } from './math'

// ── The mark (spec 30) ───────────────────────────────────────────────────────
// A 3×3×3 lattice read isometrically: a wireframe core, cubes on the face axes and the
// edge midpoints, flat panels facing outward, and a few loose accent ticks. Everything
// here is pure, so `bun test` reaches all of it; `markDraw.ts` owns the canvas.

export type MarkKind = 'core' | 'solid' | 'wire' | 'panel' | 'tick'

/** One rule of code drawn on a panel, in that panel's unit square. */
export type MarkRule = { y: number; x: number; w: number }

export type MarkPiece = {
  kind: MarkKind
  /** Lattice coordinates. Cubes live in {-1,0,1}³; panels sit at 1.8 on a single axis. */
  pos: Point3
  /** Half-edge, in lattice units. */
  size: number
  /** Whole turns each axis unwinds through as the piece settles. */
  turns: Point3
  /** Resting orientation. Only the panels use it: they face along their own axis. */
  orient: Point3
  /** Offset of the idle wobble, so the pieces do not breathe in unison. */
  phase: number
  /** Empty for every kind but `panel`. */
  rules: readonly MarkRule[]
}

/** `atan(1/√2)`: the camera tilt that makes a cube read as a true isometric drawing. */
export const ISO_TILT = Math.atan(1 / Math.SQRT2)

/** Below this box, in CSS pixels, the ticks, panels and corner cubes collapse into noise. */
export const DETAIL_MIN = 24

const ORIGIN: Point3 = { x: 0, y: 0, z: 0 }

/**
 * The LCG of `glibc`, kept in doubles on purpose. `s * 1103515245` runs past 2⁵³ and
 * loses low bits, but IEEE-754 multiplication and `ToInt32` are both fully specified, so
 * every engine loses exactly the same ones. Swapping in `Math.imul` for "correctness"
 * changes the arrangement and breaks the tests below.
 */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

const AXES: readonly Point3[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
]

/** A panel's normal points along its own axis, so it reads as a screen on that face. */
const PANEL_ORIENT: readonly Point3[] = [
  { x: 0, y: Math.PI / 2, z: 0 },
  { x: Math.PI / 2, y: 0, z: 0 },
  ORIGIN,
]

/**
 * The thirty-five pieces, in a fixed order. Every `rnd()` call below is part of the
 * arrangement: `rules` is computed for every kind and kept only for panels precisely so
 * the stream stays in step. Skipping those calls for non-panels reshuffles the whole mark.
 */
export function buildMark(): readonly MarkPiece[] {
  const rnd = seeded(7)
  const pieces: MarkPiece[] = []

  const push = (pos: Point3, kind: MarkKind, size: number, orient: Point3 = ORIGIN) => {
    const turns = {
      x: Math.round(rnd() * 2 - 1),
      y: Math.round(rnd() * 3 - 1),
      z: Math.round(rnd() * 2 - 1),
    }
    const phase = rnd() * Math.PI * 2
    const rules = Array.from({ length: 6 }, (_, i) => ({
      y: 0.16 + i * 0.135,
      x: 0.12 + rnd() * 0.1,
      w: 0.22 + rnd() * 0.5,
    }))
    pieces.push({ kind, pos, size, turns, orient, phase, rules: kind === 'panel' ? rules : [] })
  }

  push(ORIGIN, 'core', 0.46)
  AXES.forEach((axis, i) => push(axis, i % 2 ? 'wire' : 'solid', 0.3))

  // Edge midpoints fill out the hexagonal silhouette; corners cap it.
  for (const [a, b] of [
    [0, 1],
    [1, 2],
    [0, 2],
  ] as const) {
    for (const sa of [-1, 1]) {
      for (const sb of [-1, 1]) {
        const v = [0, 0, 0]
        v[a] = sa
        v[b] = sb
        if (rnd() > 0.34) {
          push({ x: v[0]!, y: v[1]!, z: v[2]! }, rnd() > 0.72 ? 'solid' : 'wire', 0.24)
        }
      }
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        if (rnd() > 0.62) push({ x: sx, y: sy, z: sz }, 'wire', 0.2)
      }
    }
  }

  AXES.forEach((axis, i) =>
    push(
      { x: axis.x * 1.8, y: axis.y * 1.8, z: axis.z * 1.8 },
      'panel',
      0.36,
      PANEL_ORIENT[i >> 1]!,
    ),
  )

  for (let i = 0; i < 9; i++) {
    const t = (i / 9) * Math.PI * 2
    push({ x: Math.cos(t) * 2.4, y: Math.sin(t * 1.7) * 2, z: Math.sin(t) * 2.4 }, 'tick', 0.45)
  }

  return pieces
}

const isCorner = (piece: MarkPiece) =>
  [piece.pos.x, piece.pos.y, piece.pos.z].filter((v) => v !== 0).length === 3

// Memoized separately from `buildMark`, which `tests/mark.test.ts` still calls uncached to
// assert the build is deterministic. `markDraw.ts`'s rAF loop calls `markPolygons` — and
// therefore this — for every visible mark on every frame; without a cache that reruns the
// 560-draw build roughly 84 times a second per mark.
let cached: readonly MarkPiece[] | undefined
let cachedReduced: readonly MarkPiece[] | undefined

/** The pieces a box of `box` CSS pixels can carry without turning into noise. */
export function markPieces(box: number): readonly MarkPiece[] {
  if (box >= DETAIL_MIN) return (cached ??= buildMark())
  return (cachedReduced ??= buildMark().filter(
    (piece) => piece.kind !== 'tick' && piece.kind !== 'panel' && !isCorner(piece),
  ))
}

// ── Rotation and culling (spec 30) ───────────────────────────────────────────

/**
 * The perspective distance, in lattice units. Deliberately far: at |z| ≤ 3.2 the scale
 * varies by under 0.4%, so the mark reads as the orthographic isometric drawing it is
 * meant to be. This is not `focalLength` from `math.ts` — that one is in pixels and
 * belongs to the node cloud, which wants visible depth.
 */
export const MARK_FOCAL = 900

export type MarkCamera = { world: Point3; f: number }

const CUBE_VERTS: readonly Point3[] = [
  { x: -1, y: -1, z: -1 },
  { x: 1, y: -1, z: -1 },
  { x: 1, y: 1, z: -1 },
  { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: 1 },
  { x: 1, y: -1, z: 1 },
  { x: 1, y: 1, z: 1 },
  { x: -1, y: 1, z: 1 },
]

export const CUBE_FACES: readonly (readonly number[])[] = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [2, 3, 7, 6],
  [1, 2, 6, 5],
  [0, 3, 7, 4],
]

/** Analytic, in the order of `CUBE_FACES`. See the culling test for why not the winding. */
const CUBE_NORMALS: readonly Point3[] = [
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
]

/** Z, then Y, then X — the order the whole mark is built on. */
export function rotate3(p: Point3, r: Point3): Point3 {
  let { x, y, z } = p
  let c = Math.cos(r.z)
  let s = Math.sin(r.z)
  ;[x, y] = [x * c - y * s, x * s + y * c]
  c = Math.cos(r.y)
  s = Math.sin(r.y)
  ;[x, z] = [x * c + z * s, -x * s + z * c]
  c = Math.cos(r.x)
  s = Math.sin(r.x)
  ;[y, z] = [y * c - z * s, y * s + z * c]
  return { x, y, z }
}

/**
 * Unwinds from `turns` whole revolutions at `settle = 0` to the resting orientation at
 * `settle = 1`. Whole revolutions, so the mark at rest is always axis-aligned — that is
 * what makes it read as a cluster instead of as debris.
 */
export function pieceRotation(piece: MarkPiece, settle: number): Point3 {
  const spin = (1 - settle) * Math.PI * 2
  return {
    x: piece.orient.x + piece.turns.x * spin,
    y: piece.orient.y + piece.turns.y * spin,
    z: piece.orient.z + piece.turns.z * spin,
  }
}

/** The slow breath a settled piece keeps. Zero while it is still flying. */
export function idleWobble(piece: MarkPiece, t: number, settle: number): Point3 {
  const w = Math.sin(t * 6e-4 + piece.phase) * 0.1 * settle
  return { x: w, y: w * 1.4, z: 0 }
}

/** How long the pieces take to lock back after a hover loosens them. */
const HOVER_MS = 600

/** How far `settle` dips on hover: the pieces loosen, they do not fly apart. */
export const HOVER_SETTLE = 0.85

/**
 * `settle` for a mark whose link was last entered at `hoverAt`, sampled at `t`. Rests at
 * 1 while nothing has been hovered (`hoverAt` of 0), drops to `HOVER_SETTLE` at the
 * moment of entry, and eases linearly back to 1 over `HOVER_MS`. Clamped at both ends,
 * so a clock that jumps backwards cannot push the pieces further apart than a hover does.
 */
export function hoverSettle(hoverAt: number, t: number): number {
  if (hoverAt === 0) return 1
  const decay = Math.min(1, Math.max(0, 1 - (t - hoverAt) / HOVER_MS))
  return 1 - (1 - HOVER_SETTLE) * decay
}

/**
 * Indices of the faces turned toward the camera, which sits at `-f` on z. The normal is
 * put through the same rotations as the vertices and tested against the face center.
 */
export function visibleFaces(pos: Point3, rot: Point3, size: number, cam: MarkCamera): number[] {
  const out: number[] = []
  CUBE_FACES.forEach((face, i) => {
    let cx = 0
    let cy = 0
    let cz = 0
    for (const v of face) {
      const local = CUBE_VERTS[v]!
      const spun = rotate3({ x: local.x * size, y: local.y * size, z: local.z * size }, rot)
      const world = rotate3({ x: spun.x + pos.x, y: spun.y + pos.y, z: spun.z + pos.z }, cam.world)
      cx += world.x / 4
      cy += world.y / 4
      cz += world.z / 4
    }
    const n = rotate3(rotate3(CUBE_NORMALS[i]!, rot), cam.world)
    if (n.x * cx + n.y * cy + n.z * (cz + cam.f) < 0) out.push(i)
  })
  return out
}

// ── Projection to polygons (spec 30) ─────────────────────────────────────────

/**
 * One shape to paint. Two points mean a stroked segment, four a filled face. Both the
 * build-time SVG and the runtime canvas consume nothing but this.
 */
export type MarkPoly = {
  kind: MarkKind | 'rule'
  points: readonly Point[]
  /** Face lighting in [0,1]. `-1` on the strokes, which have no face. */
  lit: number
  /** Mean depth, for the painter's sort. */
  depth: number
}

/** Light from above and slightly behind the viewer's left shoulder. */
const LIGHT: Point3 = { x: -0.32, y: -0.86, z: 0.4 }

const PANEL_QUAD: readonly Point3[] = [
  { x: -1, y: -1, z: 0 },
  { x: 1, y: -1, z: 0 },
  { x: 1, y: 1, z: 0 },
  { x: -1, y: 1, z: 0 },
]

const add = (a: Point3, b: Point3): Point3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const scale3 = (p: Point3, k: number): Point3 => ({ x: p.x * k, y: p.y * k, z: p.z * k })

/**
 * Pixels per lattice unit. The extent is the Euclidean norm, not the largest component:
 * a piece at (1,1,0) reaches 1.41 on screen once the camera turns, and framing it by its
 * largest component clips it. `√3 · size` is the half space-diagonal of a rotating cube.
 */
export function markScale(box: number, pieces: readonly MarkPiece[]): number {
  const extent = Math.max(
    ...pieces.map(
      (piece) => Math.hypot(piece.pos.x, piece.pos.y, piece.pos.z) + piece.size * Math.sqrt(3),
    ),
  )
  return (box / 2 / extent) * 0.94
}

/** The idle turn of the whole cluster: a full revolution takes about 22 seconds. */
export function markSpin(t: number): number {
  return t * 2.8e-4
}

function bilinear(quad: readonly Point[], u: number, v: number): Point {
  const top = { x: lerp(quad[0]!.x, quad[1]!.x, u), y: lerp(quad[0]!.y, quad[1]!.y, u) }
  const bottom = { x: lerp(quad[3]!.x, quad[2]!.x, u), y: lerp(quad[3]!.y, quad[2]!.y, u) }
  return { x: lerp(top.x, bottom.x, v), y: lerp(top.y, bottom.y, v) }
}

/**
 * The mark at time `t`, drawn into a `box`×`box` square, sorted back to front. `settle`
 * is 0 while the pieces are still turning into place and 1 at rest; `spinY` is the turn
 * of the whole cluster, which the entry choreography drives on its own.
 */
export function markPolygons(box: number, settle: number, t: number, spinY: number): MarkPoly[] {
  const pieces = markPieces(box)
  const s = markScale(box, pieces)
  const cam: MarkCamera = { world: { x: ISO_TILT, y: spinY, z: 0 }, f: MARK_FOCAL }
  const half = box / 2
  const polys: MarkPoly[] = []

  const project = (w: Point3): Point => {
    const sc = cam.f / (cam.f + w.z)
    return { x: half + w.x * sc * s, y: half + w.y * sc * s }
  }

  for (const piece of pieces) {
    const rot = add(pieceRotation(piece, settle), idleWobble(piece, t, settle))
    const world = (v: Point3) =>
      rotate3(add(rotate3(scale3(v, piece.size), rot), piece.pos), cam.world)

    if (piece.kind === 'tick') {
      const a = world({ x: -0.6, y: 0, z: 0 })
      const b = world({ x: 0.6, y: 0, z: 0 })
      polys.push({
        kind: 'tick',
        points: [project(a), project(b)],
        lit: -1,
        depth: (a.z + b.z) / 2,
      })
      continue
    }

    if (piece.kind === 'panel') {
      const corners = PANEL_QUAD.map(world)
      const quad = corners.map(project)
      const depth = corners.reduce((sum, corner) => sum + corner.z, 0) / 4
      polys.push({ kind: 'panel', points: quad, lit: 0, depth })
      for (const rule of piece.rules) {
        // A hair in front of its panel, so the sort can never put a rule behind it.
        polys.push({
          kind: 'rule',
          points: [
            bilinear(quad, rule.x, rule.y),
            bilinear(quad, Math.min(0.94, rule.x + rule.w), rule.y),
          ],
          lit: -1,
          depth: depth - 1e-3,
        })
      }
      continue
    }

    for (const face of visibleFaces(piece.pos, rot, piece.size, cam)) {
      const corners = CUBE_FACES[face]!.map((i) => world(CUBE_VERTS[i]!))
      const n = rotate3(rotate3(CUBE_NORMALS[face]!, rot), cam.world)
      const lit = -(n.x * LIGHT.x + n.y * LIGHT.y + n.z * LIGHT.z)
      polys.push({
        kind: piece.kind,
        points: corners.map(project),
        lit: Math.max(0, Math.min(1, lit)),
        depth: corners.reduce((sum, corner) => sum + corner.z, 0) / 4,
      })
    }
  }

  return polys.sort((a, b) => b.depth - a.depth)
}

/**
 * The frame both renderers start from: settled, unwobbled, and unturned. `CubeMark.astro`
 * bakes exactly this into the build-time SVG and `markDraw.ts` reproduces it on its first
 * canvas frame, so the handover is invisible. One function, so the two cannot drift.
 */
export function restingPolygons(box: number): MarkPoly[] {
  return markPolygons(box, 1, 0, markSpin(0))
}

/**
 * Opacities, never colors: `scripts/check-tokens.ts` fails on a literal color under
 * `src/`, and both consumers paint in the resolved `--color-accent`. On the near-white
 * light background the accent loses body, so everything is lifted by a third — a starting
 * value confirmed by eye, not a measured ratio: the mark is `aria-hidden` decoration.
 */
export function polyAlpha(poly: MarkPoly, light: boolean): { fill: number; stroke: number } {
  const k = light ? 1.35 : 1
  const cap = (a: number) => Math.min(1, a)
  const wash = cap((0.02 + 0.06 * Math.max(0, poly.lit)) * k)
  switch (poly.kind) {
    case 'solid':
      return { fill: light ? 1 : 0.42 + 0.5 * poly.lit, stroke: cap(0.95 * k) }
    case 'core':
      return { fill: wash, stroke: cap(0.62 * k) }
    case 'wire':
      return { fill: wash, stroke: cap(0.42 * k) }
    case 'panel':
      return { fill: cap(0.05 * k), stroke: cap(0.55 * k) }
    case 'rule':
      return { fill: 0, stroke: cap(0.45 * k) }
    case 'tick':
      return { fill: 0, stroke: cap(0.5 * k) }
  }
}

/** Hairline floor, so the mark does not dissolve at 16px. */
export function strokeWidth(kind: MarkPoly['kind'], box: number): number {
  return Math.max(0.6, box * (kind === 'core' ? 0.006 : 0.0042))
}
