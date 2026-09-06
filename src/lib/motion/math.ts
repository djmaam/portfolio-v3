// Every motion issue drops its math here: pure functions, no DOM, covered by `bun test`.
// The modules that own the plumbing (scroll.ts, reveal.ts, …) stay dumb on purpose.

/** Trims float noise so the style strings stay short and stable. */
const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Document progress of `MOTION_SPEC` §4: `scrollY / (scrollHeight - vh)`, clamped to
 * [0, 1]. A document that does not scroll has no progress, so it reports 0 instead of
 * dividing by zero.
 */
export function docProgress(scrollY: number, scrollHeight: number, vh: number): number {
  const max = scrollHeight - vh
  if (max <= 0) return 0
  return Math.min(1, Math.max(0, scrollY / max))
}

/**
 * Aurora state at a given document progress (`MOTION_SPEC` §4): the hue sweeps cyan →
 * violet → magenta → amber, the opacity ramps .45 → 1 over the first 40% of the
 * document, and the whole layer drifts up 12vh.
 */
export function auroraStyle(p: number): { filter: string; opacity: number; translateY: string } {
  return {
    filter: `hue-rotate(${Math.round(p * 260)}deg) saturate(${round(1 + 0.4 * p, 3)})`,
    opacity: 0.45 + 0.55 * Math.min(1, p * 2.5),
    translateY: `${round(-12 * p)}vh`,
  }
}

/** The console glyphs the scramble draws from (`MOTION_SPEC` §1). */
const GLYPHS = '<>/_-=+*#%&{}[]|\\01'

/**
 * One frame of the scramble of `MOTION_SPEC` §1, at progress `p` ∈ [0, 1]. The resolved
 * prefix is `floor(p² · len)` characters, so the text settles left to right and
 * accelerates; everything past it is a random glyph, except spaces, which never scramble
 * so the word shape holds. `rand` is injectable to keep the tests deterministic.
 */
export function scrambleFrame(target: string, p: number, rand: () => number = Math.random): string {
  const resolved = Math.floor(p ** 2 * target.length)
  let out = target.slice(0, resolved)
  for (let i = resolved; i < target.length; i++) {
    // `Math.random` never returns 1, but an injected `rand` might: clamp, don't trust.
    out +=
      target[i] === ' '
        ? ' '
        : GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(rand() * GLYPHS.length))]
  }
  return out
}

/**
 * Where an anchor link should scroll to: the target's document top minus the nav that
 * would cover it (`MOTION_SPEC` §1). Clamped at 0, which is both what `#top` needs and
 * what any target sitting under the nav needs.
 */
export function anchorOffset(top: number, navH: number): number {
  return Math.max(0, top - navH)
}

/**
 * When the element with `data-boot="n"` is revealed (`MOTION_SPEC` §2): 500ms for the
 * page to settle, then 170ms per step. The console skips to `n = 10`, i.e. 2200ms, which
 * leaves room for more elements in the text column without moving it.
 */
export function bootDelay(n: number): number {
  return 500 + n * 170
}

/**
 * Characters of the typed eyebrow visible after `elapsed` ms at `perChar` ms each
 * (`MOTION_SPEC` §2). A negative `elapsed` — the wait before the first character — yields
 * 0, so the driver expresses its delay as an offset instead of a timer of its own.
 */
export function typedLength(elapsed: number, perChar: number, total: number): number {
  return Math.min(total, Math.max(0, Math.floor(elapsed / perChar)))
}

/**
 * The console metrics at a given tick, exactly as the mock computes them
 * (`Portfolio.dc.html:696`): `agents` flips between 3 and 4, `specs` gains one per full
 * pass of the 11-message log, and `shipped` one per six lines. Only ever counts up.
 */
export function metricsAt(tick: number): { agents: number; specs: number; shipped: number } {
  return {
    agents: 3 + (tick % 2),
    specs: 12 + Math.floor(tick / 11),
    shipped: 41 + Math.floor(tick / 6),
  }
}

/**
 * Indices into the console log of the at most `max` lines still visible after `tick` of
 * them have been emitted, over a source of `length` messages that cycles forever
 * (`MOTION_SPEC` §2). The oldest line drops as the newest enters, so the window never
 * grows past `max`. `Console.astro` renders `logWindow(max, …)` — the first six of the
 * cycle — so the markup and the first client frame agree.
 */
export function logWindow(tick: number, length: number, max: number): number[] {
  const from = Math.max(0, tick - max)
  return Array.from({ length: tick - from }, (_, i) => (from + i) % length)
}

// ── Node network (`MOTION_SPEC` §3) ──────────────────────────────────────────
// The whole of the hero canvas' arithmetic. `network.ts` owns the canvas, the node
// array and the rAF loop; every formula it needs is here, where `bun test` reaches it.

export type Point = { x: number; y: number }
export type Point3 = Point & { z: number }
/** Radii of the ellipsoid the nodes orbit on. */
export type Radii = { rx: number; ry: number; rz: number }
/** A card measured in canvas coordinates — offsets, so no transform ever pollutes it. */
export type Rect = { left: number; top: number; width: number; height: number }

/** Distance at which two nodes stop being connected (`MOTION_SPEC` §3). */
export const CONNECT_DIST = 150
/** Reach of the cursor's attraction, of its violet lines, and of the card's anchors. */
export const CURSOR_DIST = 200
export const CURSOR_LINK_DIST = 170
export const ANCHOR_DIST = 280
/** Reach of the alpha boost the cursor gives to the connections around it. */
export const CURSOR_BOOST_DIST = 220

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Linear fade of a distance over a radius: 1 at the center, 0 at the edge and beyond. */
export function fade(dist: number, radius: number): number {
  return clamp01(1 - dist / radius)
}

/** The ease-in-out cubic of the base curve, used by the ✳ formation. */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * The ellipsoid the cloud sits on (`MOTION_SPEC` §3): a fraction of the viewport on each
 * axis, shrunk by the scroll collapse down to 15% of its size.
 */
export function ellipsoidRadii(w: number, h: number, collapse: number): Radii {
  const k = 1 - 0.85 * collapse
  return { rx: w * 0.56 * k, ry: h * 0.48 * k, rz: Math.min(w, h) * 0.5 * k }
}

/**
 * A point on the surface of that ellipsoid, at longitude `theta` and latitude `phi`.
 * `(x/rx)² + (y/ry)² + (z/rz)²` is 1 for every pair of angles, which is what the test
 * asserts and what keeps the cloud from bulging.
 */
export function ellipsoidPoint(theta: number, phi: number, r: Radii): Point3 {
  const cp = Math.cos(phi)
  return {
    x: Math.cos(theta) * cp * r.rx,
    y: Math.sin(phi) * r.ry,
    z: Math.sin(theta) * cp * r.rz,
  }
}

/** Rotates a point about the X axis: the camera tilt the cursor drives. */
export function rotateX(p: Point3, angle: number): Point3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c }
}

/**
 * Perspective projection (`MOTION_SPEC` §3): `sc = f / (f + z)`, so a node shrinks as it
 * moves away. `depth` remaps that scale into [.3, 1] and drives both size and alpha, and
 * `x`/`y` land around the center of the camera — the caller shifts them onto the console.
 */
export function projectNode(
  p: Point3,
  cam: { f: number; w: number; h: number },
): {
  x: number
  y: number
  sc: number
  depth: number
} {
  const sc = cam.f / (cam.f + p.z)
  return {
    x: cam.w / 2 + p.x * sc,
    y: cam.h / 2 + p.y * sc,
    sc,
    depth: 0.3 + 0.7 * clamp01((sc - 0.6) / 0.7),
  }
}

/** The perspective distance of `MOTION_SPEC` §3, from the size of the canvas. */
export function focalLength(w: number, h: number): number {
  return Math.max(w, h) * 0.9
}

/**
 * Where node `i` of `total` sits on the six-armed ✳ it converges into, relative to the
 * center (`MOTION_SPEC` §3). Consecutive nodes go to consecutive arms and each full turn
 * of six steps one ring further out, so the arms fill evenly and the figure stays
 * balanced about the center.
 */
export function asteriskTarget(i: number, total: number, radius: number): Point {
  const arms = 6
  const rings = Math.max(1, Math.ceil(total / arms))
  const angle = (i % arms) * (Math.PI / 3) + Math.PI / 2
  const r = (0.12 + (Math.floor(i / arms) / rings) * 0.88) * radius
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
}

/**
 * The ✳ formation timeline of `MOTION_SPEC` §3, `p` being how far the nodes are pulled
 * toward their target: converge 300 → 1200ms on an ease-in-out cubic, hold to 1900, then
 * dissolve to 2800 as the console arrives. Outside that window the cloud is on its own.
 */
export function formationPhase(t: number): {
  mode: 'idle' | 'forming' | 'holding' | 'dissolving'
  p: number
} {
  if (t < 300) return { mode: 'idle', p: 0 }
  if (t < 1200) return { mode: 'forming', p: easeInOut((t - 300) / 900) }
  if (t < 1900) return { mode: 'holding', p: 1 }
  if (t < 2800) return { mode: 'dissolving', p: 1 - easeInOut((t - 1900) / 900) }
  return { mode: 'idle', p: 0 }
}

/**
 * Alpha of the line between two nodes `dist` apart (`MOTION_SPEC` §3): it fades to
 * nothing at 150px, and the light theme needs more of it to read against a pale
 * background. `minDepth` is the depth of the further of the two, so a line sinks with
 * the node that is deepest in.
 */
export function connectionAlpha(dist: number, minDepth: number, dark: boolean): number {
  return fade(dist, CONNECT_DIST) * (dark ? 0.22 : 0.28) * minDepth
}

/** How far the network has collapsed under the scroll: 0 at the top, 1 at .75 viewports. */
export function collapseFactor(scrollY: number, vh: number): number {
  if (vh <= 0) return 0
  return clamp01(scrollY / (vh * 0.75))
}

/** Head start of hop `n` of a command, in units of the pulse's own progress. */
export function commandHopDelay(hop: number): number {
  return -(hop + 1) * 0.55
}

/** 84 nodes on the desktop, 48 under 720px (`MOTION_SPEC` §3). */
export function nodeCountFor(width: number): number {
  return width < 720 ? 48 : 84
}

/**
 * Index of the point closest to `(x, y)` within `maxDist`, or -1. `eligible` is what
 * lets the caller skip the nodes hidden behind the console card or too far back to read.
 */
export function nearestPoint(
  points: readonly Point[],
  x: number,
  y: number,
  maxDist: number,
  eligible?: (index: number) => boolean,
): number {
  let best = -1
  let bestDist = maxDist
  for (let i = 0; i < points.length; i++) {
    const p = points[i] as Point
    if (eligible && !eligible(i)) continue
    const d = Math.hypot(p.x - x, p.y - y)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

export type Pulse = { from: number; to: number; delay: number }

/**
 * The command of `MOTION_SPEC` §3: a breadth-first walk of at most `hops` levels through
 * the connection graph, one pulse per edge it discovers, each level delayed by
 * `commandHopDelay`. A node is pulsed once — `seen` is what keeps a dense cluster from
 * ringing forever — and the walk stops early when the frontier empties, which is what
 * makes it terminate on a disconnected graph. `limit` caps a very dense frame.
 */
export function commandPulses(
  points: readonly Point[],
  start: number,
  maxDist: number = CONNECT_DIST,
  hops = 3,
  limit = 40,
): Pulse[] {
  const pulses: Pulse[] = []
  if (start < 0 || start >= points.length) return pulses

  const seen = new Set([start])
  let frontier = [start]

  for (let hop = 0; hop < hops && frontier.length > 0; hop++) {
    const next: number[] = []
    for (const a of frontier) {
      const pa = points[a] as Point
      for (let b = 0; b < points.length; b++) {
        if (seen.has(b)) continue
        const pb = points[b] as Point
        if (Math.hypot(pa.x - pb.x, pa.y - pb.y) >= maxDist) continue
        seen.add(b)
        next.push(b)
        pulses.push({ from: a, to: b, delay: commandHopDelay(hop) })
        if (pulses.length >= limit) return pulses
      }
    }
    frontier = next
  }
  return pulses
}

/**
 * The four anchors on the edges of the console card (`MOTION_SPEC` §3): left at 25% and
 * 62%, bottom at 50%, top at 30%. The 62% one is where every command starts.
 */
export function consoleAnchors(rect: Rect): Point[] {
  const { left, top, width: w, height: h } = rect
  return [
    { x: left, y: top + h * 0.25 },
    { x: left, y: top + h * 0.62 },
    { x: left + w * 0.5, y: top + h },
    { x: left + w * 0.3, y: top },
  ]
}

/** Whether a point falls on the console card, which is what occludes a node from it. */
export function insideCard(x: number, y: number, rect: Rect | null, pad = 10): boolean {
  if (!rect) return false
  return (
    x > rect.left - pad &&
    x < rect.left + rect.width + pad &&
    y > rect.top - pad &&
    y < rect.top + rect.height + pad
  )
}

/**
 * Where the cloud is centered: on the console, but pulled only 35% of the way there from
 * the middle of the canvas, so the ellipsoid still covers the text column. Before the
 * card has been measured it falls back to the resting position of the design.
 *
 * `pull` is that fraction. The ✳ formation asks for 1, because `MOTION_SPEC` §3 centers
 * it "en la consola" — on the card itself, not on the damped center the cloud orbits.
 * At 0.35 it forms 210px to the left of the console and lands on the H1.
 */
export function cloudCenter(rect: Rect | null, w: number, h: number, pull = 0.35): Point {
  if (!rect) return { x: w * 0.64, y: h * 0.45 }
  const cx = rect.left + rect.width / 2
  // Ten pixels above the middle of the card: the log, not the metrics, is the center.
  return { x: w * 0.5 + (cx - w * 0.5) * pull, y: rect.top + rect.height / 2 - 10 }
}

/**
 * How much a node is pulled toward a cursor `(dx, dy)` away (`MOTION_SPEC` §3): force
 * `(1 - d/200) · 1.4` along the line to the cursor, nothing past 200px. A cursor right
 * on top of a node pulls nothing, which is what stops it from being flung.
 */
export function cursorPull(dx: number, dy: number): Point {
  const d = Math.hypot(dx, dy)
  if (d <= 1 || d >= CURSOR_DIST) return { x: 0, y: 0 }
  const f = fade(d, CURSOR_DIST) * 1.4
  return { x: (dx / d) * f, y: (dy / d) * f }
}

/**
 * Camera angles for a cursor at `(mx, my)` in [0, 1] of the canvas: tilt ±.25 rad,
 * rotation ±.15 (`MOTION_SPEC` §3). The center of the canvas is the resting camera.
 */
export function cameraAngles(mx: number, my: number): { tilt: number; rot: number } {
  return { tilt: (my - 0.5) * -0.5, rot: (mx - 0.5) * 0.3 }
}

/**
 * Global rotation per rendered frame: `.00003 rad/frame` at 60fps, so 24ms worth of it
 * per throttled frame, sped up to six times that as the network collapses.
 */
export function rotationStep(collapse: number): number {
  return 0.00003 * 24 * (1 + 5 * collapse)
}

/** Median of a sample. The degradation check needs it, and an outlier must not win. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
}

/** Straight interpolation from `a` to `b`; the ✳ formation pulls each node along one. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Radius of the ✳ the nodes converge into: 26% of the shorter side (`MOTION_SPEC` §3). */
export function asteriskRadius(w: number, h: number): number {
  return Math.min(w, h) * 0.26
}

/** The ±9px vertical bob every node rides, offset by its own phase. */
export function verticalDrift(t: number, phase: number): number {
  return Math.sin(t * 0.001 + phase) * 9
}

/** The slow brightness flicker of a node, in [.1, 1]. */
export function twinkle(t: number, phase: number): number {
  return 0.55 + 0.45 * Math.sin(t / 900 + phase)
}

/** Drawn radius of a node: its own size scaled by depth, swollen while it flashes. */
export function nodeRadius(size: number, depth: number, flash: number): number {
  return size * (0.5 + depth) + flash * 2
}

/** Alpha of a node's dot: its twinkle, dimmed by depth, stronger against a dark page. */
export function nodeAlpha(depth: number, twinkleValue: number, dark: boolean): number {
  return (dark ? 0.9 : 0.8) * twinkleValue * depth
}

// ── About (`MOTION_SPEC` §6) ─────────────────────────────────────────────────

/**
 * How far the lead has travelled through its illumination ramp: 0 while its top is
 * still below 80% of the viewport, 1 once it has risen .45 viewports past that. A
 * viewport of no height has no ramp, so it reports 0 instead of dividing by zero.
 */
export function aboutProgress(top: number, vh: number): number {
  if (vh <= 0) return 0
  return clamp01((0.8 * vh - top) / (0.45 * vh))
}

/**
 * Opacity of word `index` of `total` at progress `p` (`MOTION_SPEC` §6). The ramp is
 * `total + 3` words long, so the sentence finishes lighting up a little before the
 * progress does; a word never falls below the .16 it rests at.
 */
export function wordOpacity(index: number, total: number, p: number): number {
  return Math.min(1, Math.max(0.16, p * (total + 3) - index))
}

/**
 * Stagger of reveal `i` within its group, in ms (`MOTION_SPEC` §5): the principles use
 * 110 per card, which `reveal.ts` reads back from `data-delay`.
 */
export function revealDelay(index: number): number {
  return 110 * index
}

// ── How I work (`MOTION_SPEC` §7) ────────────────────────────────────────────

/**
 * Which of the five steps is lit at track progress `p`, and whether the cycle has
 * finished (`MOTION_SPEC` §7): nothing is lit over the first 6% of the track, the five
 * steps share the next 84%, and the last 7% is the finished state.
 *
 * A pure function of `p` on purpose. The driver derives the whole section from the
 * progress of the current frame and never accumulates anything across frames, which is
 * what makes scrolling back up walk the states backwards for free.
 */
export function methodStep(p: number): { active: number; done: boolean } {
  return {
    active: p < 0.06 ? -1 : Math.min(4, Math.floor(((p - 0.06) / 0.84) * 5)),
    done: p >= 0.93,
  }
}

/**
 * The visual state of card `index` (`MOTION_SPEC` §7): every card turns at once when the
 * cycle is done; before that, the one that is lit, the ones already walked, and the ones
 * still ahead. Derived from `step` alone, like everything else in this section, so the
 * whole grid walks backwards when the page does.
 */
export function methodCardState(
  index: number,
  step: { active: number; done: boolean },
): 'upcoming' | 'active' | 'completed' | 'done' {
  if (step.done) return 'done'
  if (index === step.active) return 'active'
  return index < step.active ? 'completed' : 'upcoming'
}

/**
 * Progress of that track, clamped to [0, 1] (`MOTION_SPEC` §7). Pinned, it advances over
 * everything the track can scroll while its sticky block stays stuck. In flow — narrow
 * viewport, or a block that does not fit in one — it starts when the top of the section
 * is .85 viewports down and runs over .9 of its height. A track that cannot move reports
 * 0 instead of dividing by zero.
 */
export function methodProgress(top: number, height: number, vh: number, pinned: boolean): number {
  const travel = pinned ? height - vh : height * 0.9
  if (travel <= 0) return 0
  return clamp01((pinned ? -top : 0.85 * vh - top) / travel)
}

/**
 * The status line of the header (`MOTION_SPEC` §7): `VERB · n/5` while a step is lit,
 * `idle` before the first one, `finished` once the cycle is done. A `verbs` list too
 * short for the active step falls back to `idle`, so a `stepVerbs` that lost a pipe
 * reads as nothing rather than as the wrong verb.
 */
export function methodLabel(
  verbs: readonly string[],
  step: { active: number; done: boolean },
  idle: string,
  finished: string,
): string {
  if (step.done) return finished
  const verb = verbs[step.active]
  return verb === undefined ? idle : `${verb} · ${step.active + 1}/${verbs.length}`
}
