import type { Point3 } from './math'

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

/** The pieces a box of `box` CSS pixels can carry without turning into noise. */
export function markPieces(box: number): readonly MarkPiece[] {
  const all = buildMark()
  if (box >= DETAIL_MIN) return all
  return all.filter((piece) => piece.kind !== 'tick' && piece.kind !== 'panel' && !isCorner(piece))
}

// ── Rotation and culling (spec 35) ───────────────────────────────────────────

/**
 * The perspective distance, in lattice units. Deliberately far: at |z| ≤ 3.2 the scale
 * varies by under 0.4%, so the mark reads as the orthographic isometric drawing it is
 * meant to be. This is not `focalLength` from `math.ts` — that one is in pixels and
 * belongs to the node cloud, which wants visible depth.
 */
export const MARK_FOCAL = 900

export type MarkCamera = { world: Point3; f: number }

export const CUBE_VERTS: readonly Point3[] = [
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
export const CUBE_NORMALS: readonly Point3[] = [
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
