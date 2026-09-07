import { markSpin } from './mark'
import { lerp, type Point } from './math'

// ── The entry choreography (spec 31) ─────────────────────────────────────────
// Six overlapping phases: the mark seeds at the center of the viewport, expands into its
// lattice, flies into the nav, throws energy into the hero that becomes the node cloud,
// the console rises with its scan line, and the hero copy cascades last. Everything here
// is pure, so `bun test` reaches all of it; `entryDriver.ts` owns the canvas.
//
// This replaces `MOTION_SPEC` §2's boot timing and §3's ✳ formation. `handoff/` is
// read-only and still describes both; spec 31 documents the deviation.

export type PhaseName = 'SEED' | 'EXPAND' | 'DOCK' | 'ENERGY' | 'CONSOLE' | 'CONTENT'

export type Phase = { name: PhaseName; from: number; to: number }

/**
 * Fractions of the total duration, so one constant retimes the whole sequence. The phases
 * overlap on purpose: run end to end they came to 7.2s in the prototype, which is too long
 * for a first visit. Energy leaves the mark while it is still in flight, and the console
 * arrives while the cloud is still assembling.
 */
export const PHASES: readonly Phase[] = [
  { name: 'SEED', from: 0, to: 0.095 },
  { name: 'EXPAND', from: 0.09, to: 0.38 },
  { name: 'DOCK', from: 0.355, to: 0.57 },
  { name: 'ENERGY', from: 0.52, to: 0.76 },
  { name: 'CONSOLE', from: 0.69, to: 0.88 },
  { name: 'CONTENT', from: 0.78, to: 1 },
]

/** Below 3200 the expansion stops reading; above 5000 the site feels like it waits. */
export const ENTRY_MS = 4200

/** How long one `[data-boot]` element takes to arrive, as a fraction of the duration. */
export const ENTRY_REVEAL = 0.09

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const norm = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const inOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const outCubic = (t: number) => 1 - (1 - t) ** 3
const outBack = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2

const phase = (name: PhaseName): Phase => PHASES.find((p) => p.name === name) as Phase

/** The bounds of one phase in milliseconds, at a total duration of `D`. */
export function entrySpan(name: PhaseName, D: number): { from: number; to: number } {
  const { from, to } = phase(name)
  return { from: from * D, to: to * D }
}

/** Progress of one phase in [0, 1] at `t`: 0 before it starts, 1 once it has ended. */
export function phaseAt(name: PhaseName, t: number, D: number): number {
  const { from, to } = entrySpan(name, D)
  return norm(t, from, to)
}

export type MarkFrame = {
  /** How far the pieces have flown out of the seed, in `markPolygons` units. */
  expand: number
  /** 0 while the pieces are still unwinding their turns, 1 at rest. */
  settle: number
  /** The turn of the whole cluster, the mark's own idle spin included. */
  spinY: number
  center: Point
  /** Side of the square `markPolygons` draws into, in CSS pixels. */
  scale: number
  alpha: number
}

/**
 * The mark at `t`: collapsed at the center of the viewport, expanding into the lattice,
 * then shrinking into the nav slot. `nav` is the FLIP target — the center and the box of
 * the nav's `[data-mark]`, measured once by the driver.
 *
 * The landing is a clamp and not a lerp on purpose. At `dock = 1` the overlay's frame has
 * to be *the same* frame `markDraw.ts` paints in the nav, and `a + (b - a) * 1` is not
 * always `b` in IEEE-754: one ulp of difference in the box is a visible jump the moment the
 * overlay is destroyed.
 */
export function markTransform(
  t: number,
  D: number,
  view: { w: number; h: number },
  nav: { x: number; y: number; box: number },
): MarkFrame {
  const pSeed = phaseAt('SEED', t, D)
  const pExpand = phaseAt('EXPAND', t, D)
  const pDock = phaseAt('DOCK', t, D)
  const dock = inOut(pDock)
  const landed = dock >= 1

  // The pieces overshoot slightly and settle; the cluster's growth is a plain outCubic.
  const expand = pExpand >= 1 ? 1 : lerp(0.08, 1, outBack(pExpand))
  // 19% of the shorter side, which on a portrait phone is the width — and 19% of 390px
  // reads as a speck rather than as the mark. Below the site's own 720 breakpoint
  // (`nodeCountFor`, the aurora's third blob) the expansion is sized off the width.
  const big = (view.w < 720 ? view.w * 0.34 : Math.min(view.w, view.h) * 0.19) * 0.85
  const grown = big * lerp(0.25, 1, outCubic(pExpand))

  return {
    expand,
    settle: outCubic(clamp01((pExpand - 0.25) / 0.75)),
    // Whole extra turns while the pieces are still out: the cluster arrives already
    // turning, and by the end of EXPAND it is exactly on the mark's own idle spin.
    spinY: markSpin(t) + (1 - pExpand) * 2.4,
    center: landed
      ? { x: nav.x, y: nav.y }
      : { x: lerp(view.w / 2, nav.x, dock), y: lerp(view.h * 0.43, nav.y, dock) },
    scale: landed ? nav.box : lerp(grown, nav.box, dock),
    alpha: lerp(0.35, 1, clamp01(pSeed * 2)),
  }
}

/**
 * When the element with `data-boot="n"` is revealed. Replaces `bootDelay`, which was
 * `500 + n · 170` against a fixed clock: the cascade is the last phase of the entry now,
 * so it retimes with `D` like everything else.
 */
export function entryDelay(n: number, D: number): number {
  return entrySpan('CONTENT', D).from + n * 0.038 * D
}

/**
 * One energy particle on its way from the mark to the node it becomes. `delay` in [0, 1)
 * staggers it, so the cloud fills in instead of arriving as a block, and the sine lifts it
 * onto an arc so it falls out of the mark rather than sliding toward the hero.
 *
 * The particles are decoration on the overlay: `network.ts` keeps owning the real cloud and
 * fades in over the same window (`cloudFade`), so they arrive as it resolves.
 */
export function energyParticle(
  from: Point,
  to: Point,
  pEnergy: number,
  delay: number,
  h: number,
): Point {
  const e = outCubic(clamp01((pEnergy - delay * 0.5) * 2))
  // Exactly on the node, not a rounding error away from it: the real cloud is already
  // painting there and a particle half a pixel off reads as a double node.
  if (e >= 1) return { x: to.x, y: to.y }
  const y = lerp(from.y, to.y, e) - Math.sin(e * Math.PI) * h * 0.12
  return { x: lerp(from.x, to.x, e), y: Math.min(h, Math.max(0, y)) }
}

/**
 * The console card over its phase: it rises, unblurs and takes the scan line 35% in. The
 * driver writes all five per frame, which is why the card's resting state in `app.css`
 * carries no transition of its own — a transition would fight the frames.
 */
export function consoleEntry(
  t: number,
  D: number,
): { opacity: number; translateY: number; scale: number; blur: number; sweep: number } {
  const { from, to } = entrySpan('CONSOLE', D)
  const p = outCubic(phaseAt('CONSOLE', t, D))
  return {
    opacity: p,
    translateY: (1 - p) * 24,
    scale: lerp(0.96, 1, p),
    blur: (1 - p) * 10,
    sweep: norm(t, from + 0.35 * (to - from), to),
  }
}

/** The hero cloud's own fade-in, so the particles land as the real nodes resolve. */
export function cloudFade(t: number, D: number): number {
  return outCubic(phaseAt('ENERGY', t, D))
}
