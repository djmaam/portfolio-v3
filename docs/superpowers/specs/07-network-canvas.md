# 07 · Node network canvas — spec

Issue: [PV3-12](https://linear.app/portfolio-djmaam-v3/issue/PV3-12) · Branch: `feat/07-network-canvas`
Design: `handoff/MOTION_SPEC.md` §3, §13 · `handoff/reference/Portfolio.dc.html`

## Goal

The hero's background: 84 nodes on a rotating 3D ellipsoid, converging into the ✳ on
load, wired to the console, reacting to the cursor, and collapsing on scroll.

This is the heaviest block in the project. It is also the one where the math/DOM split
pays off most: nearly all of it is testable without a browser.

## Context

`Hero.astro` renders inside `container-page` (max-width 1200px). The canvas is
**full-bleed** and must escape that. Restructure: the hero `<section>` becomes
`position: relative` and full-width, with an inner `container-page` wrapper holding the
two columns. The canvas is a direct child of the section, `position: absolute; inset: 0`.

Stacking: the aurora is `z-index: 0` fixed in `Base`, page content sits in a `z-[1]`
wrapper. Inside that wrapper the hero creates its own stacking context, so the canvas
takes `z-index: 0` and the columns `z-index: 1` — canvas above the aurora, below the
text, no negative z-indexes anywhere.

Already available and **to be reused, not reimplemented**: `onScroll` (`scroll.ts`),
`onLogLine` (`consoleLog.ts`), `prefersReducedMotion` (`reduced.ts`), `math.ts`.

## Scope

### 1. Pure math — `src/lib/motion/math.ts`

Everything below is a pure function with unit tests and no DOM. Anything random takes an
injectable `rand` so tests are deterministic.

```ts
ellipsoidPoint(theta, phi, r: {rx, ry, rz}): {x, y, z}
projectNode(p: {x,y,z}, cam: {f, w, h}): {x, y, sc, depth}
asteriskTarget(i: number, total: number, radius: number): {x, y}
formationPhase(t: number): {mode: 'idle'|'forming'|'holding'|'dissolving', p: number}
connectionAlpha(dist: number, minDepth: number, dark: boolean): number
collapseFactor(scrollY: number, vh: number): number
commandHopDelay(hop: number): number       // -(hop + 1) * .55
nodeCountFor(width: number): number        // 84 desktop, 48 under 720px
```

Values, straight from `MOTION_SPEC` §3:

- Ellipsoid radii: `RX = .56W`, `RY = .48H`, `RZ = .5·min(W,H)`.
- Perspective: `f = .9·max(W,H)`, `sc = f / (f + z)`, `depth ∈ [.3, 1]` drives size and alpha.
- Connections: distance `< 150px`, alpha `(1 - d/150) · .22` dark, `· .28` light, times `min(depth)`.
- ✳: 6 arms, `R = .26·min(W,H)`, centered on the console. Timeline: converge 300→1200ms
  with an ease-in-out cubic, hold to 1900, dissolve 1900→2800.
- Collapse: `clamp(scrollY / (.75·vh), 0, 1)`.

### 2. The canvas class — `src/lib/motion/network.ts`

One class, no dependencies. Owns the canvas element, the node array, and the rAF loop.
It reads `math.ts` for every formula; it must contain **no arithmetic worth testing**.

- Sizing: `devicePixelRatio` capped at 2. Resize is driven by the existing `onScroll`
  subscription's `vh`/resize tick — do **not** add a `resize` listener.
- Loop: rAF with a 24ms throttle (30–40fps target).
- `aria-hidden="true"`, `pointer-events: none`.
- `mask-image: linear-gradient(180deg, #000 55%, transparent)`.

Per-node state: `theta`, `phi`, `dTheta ∈ ±.0005`, latitude oscillation bouncing at
`±1.4 rad`, vertical `sin` of ±9px. Global rotation `.00003 rad/frame`.

### 3. Console wiring

Four anchors on the card's edges: left 25%, left 62%, bottom 50%, top 30%. Each connects
to the nearest visible node within 280px, skipping nodes occluded by the card.

The card rect is read **once per resize**, cached — never per frame.

Every log line (`onLogLine`) fires a command: a pulse from the left-62% anchor, then a
**BFS of 3 hops** through the connection graph. Hop `n` is delayed by `commandHopDelay(n)`,
travels at `.045` per frame with a `.18` tail. On arrival the node flashes: a ring growing
to 22px, decaying `×.93` per frame.

Commands stop firing once `collapse ≥ .6`.

### 4. Cursor

A violet node with a glow. Attracts nodes within 200px with force `(1 - d/200) · 1.4`,
decaying `×.9`. Violet lines to nodes within 170px. Nearby connections gain `+.35` alpha.
The pointer tilts the camera: `tilt ±.25 rad`, `rot ±.15`.

Desktop only. On touch, no cursor node and no attraction — bind on `pointermove` with
`pointerType === 'mouse'` rather than sniffing the user agent.

### 5. Scroll collapse

From the existing `onScroll` subscription: radius `×(1 - .85·collapse)`, rotation
`×(1 + 5·collapse)`, `globalAlpha = 1 - collapse`. At `collapse >= 1` the loop parks
itself — no drawing while the canvas is invisible — and resumes when it drops below 1.

### 6. Performance

Budget: ≤4ms per frame on an M1 (`MOTION_SPEC` §13). Mobile starts at 48 nodes.

Degradation: sample frame times over the first 60 frames; if the median exceeds 33ms,
drop to 40 nodes **once** and stop sampling. No adaptive loop that could oscillate.

### 7. Reduced motion

The canvas is **not created at all** — no element in the DOM, no rAF, no subscriptions.
Assert the absence of the element, not just that it is invisible.

## Acceptance criteria

- [ ] `bun test`: `projectNode` returns known values for a node at the front, at the back, and at the edge, including that `sc` shrinks as `z` grows.
- [ ] `bun test`: `ellipsoidPoint` puts every point on the ellipsoid surface — `(x/rx)² + (y/ry)² + (z/rz)² ≈ 1` for a sweep of angles.
- [ ] `bun test`: `asteriskTarget` distributes `total` nodes across exactly 6 arms, all within `radius`, symmetric about the center.
- [ ] `bun test`: `formationPhase` returns the right mode and a 0→1 progress at t = 0, 300, 750, 1200, 1900, 2350, 2800 and beyond.
- [ ] `bun test`: `connectionAlpha` is 0 at exactly 150px, maximum at 0px, and higher in light than dark for the same distance.
- [ ] `bun test`: `collapseFactor` is 0 at 0, 1 at `.75·vh`, and clamps above.
- [ ] `bun test`: the BFS visits at most 3 hops, never repeats a node, and terminates on a disconnected graph.
- [ ] `bun test`: `commandHopDelay(n) === -(n + 1) * .55`.
- [ ] `bun test`: `nodeCountFor` gives 84 at 1440px and 48 at 600px.
- [ ] With `reduce`: no `<canvas>` element exists in the DOM.
- [ ] Still exactly one scroll listener call site and one delegated anchor handler; the canvas adds neither a `scroll` nor a `resize` listener.
- [ ] The canvas is `aria-hidden`, `pointer-events: none`, and sits behind the hero text.
- [ ] With JavaScript disabled the hero is unaffected — the canvas simply never appears.
- [ ] Measured frame time stays within budget at 84 nodes; report the actual number.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.

## Out of scope

Every section below the hero. The interactive console (v1.1) — this block consumes
`onLogLine` as it already exists and does not change it.
