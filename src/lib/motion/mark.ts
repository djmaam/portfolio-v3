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
