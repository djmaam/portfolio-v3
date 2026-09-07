# 30 · Cube mark: the isometric cluster replaces the ✳ — spec

Issue: [PV3-35](https://linear.app/portfolio-djmaam-v3/issue/PV3-35) ·
Branch: `feat/30-cube-mark`
Design: this spec · prototype at
[`docs/prototypes/logo-cube.html`](../../prototypes/logo-cube.html)

> [!NOTE]
> **Documented deviation from `handoff/MOTION_SPEC.md` §1.** The handoff specifies the ✳
> glyph with the `think` keyframes. That glyph is generic, and the site has outgrown it.
> `handoff/` is read-only and stays as it is; this spec supersedes §1 for the nav and
> footer mark only. The ✳ **formation of the node cloud** (`MOTION_SPEC` §3) is a separate
> thing and is untouched here — it belongs to [31](./31-entry-choreography.md).

## Goal

Replace the ✳ in `Nav.astro` and `Footer.astro` with an isometric cube cluster: a
wireframe core, solid cubes on the face axes, wireframe cubes filling out the hexagonal
silhouette, and six flat panels reading as files. Every piece rotates on its own axes, on
top of a rotation of the whole cluster.

This block ships the mark and nothing else. It is mergeable on its own: the site gets the
new mark whether or not the entry choreography ever lands.

## The mark

The cluster is a 3×3×3 lattice read isometrically. Positions are lattice coordinates in
`{-1, 0, 1}`; sizes are half-edges in the same unit.

| Piece   | Position                              | Size | Count | Render                          |
| ------- | ------------------------------------- | ---- | ----- | ------------------------------- |
| core    | `(0,0,0)`                             | 0.46 | 1     | wireframe, heavier stroke       |
| solid   | three of the six face axes            | 0.30 | 3     | filled, shaded per face         |
| axis    | the other three face axes             | 0.30 | 3     | wireframe                       |
| edge    | edge midpoints, two non-zero coords   | 0.24 | 10    | wireframe, three of them filled |
| corner  | `(±1,±1,±1)`                          | 0.20 | 3     | wireframe                       |
| panel   | face axes × 1.8, normal along its axis | 0.36 | 6     | flat quad + six short code rules |
| tick    | radius ≈ 2.4, off-lattice             | 0.45 | 9     | single stroked segment          |

Thirty-five pieces: six filled cubes, thirteen wireframe, one core, six panels, nine
ticks. Which of the twelve edge slots and eight corner slots are occupied comes from a seeded
LCG (`seed = 7`) evaluated once at module load, not from `Math.random`: the arrangement
has to be byte-identical between the build-time SVG and the runtime canvas, or the mark
visibly jumps when the canvas mounts.

**Detail threshold.** Below a 24px box the ticks, panels and corner cubes are dropped —
at 14px they collapse into noise. The prototype's size test is the evidence. The nav
renders at 20px and the footer at 16px, so both draw the reduced set of seventeen; only
the entry overlay of [31](./31-entry-choreography.md) ever draws all thirty-five.

At full detail the ticks reach 4.7 lattice units and set the frame, so the cubes occupy
about 62% of the box. That only ever applies to the full-screen entry overlay; the nav and
the footer draw the reduced set, which fills 95%.

## Rendering

The projection is the formula `network.ts` already uses — `sc = f / (f + z)` — but `f` is
`MARK_FOCAL = 900` in lattice units, not `focalLength(w, h)` in pixels. At |z| ≤ 3.2 the
scale then varies by under 0.4%, so the mark reads as the orthographic isometric drawing
the reference is. Nothing new is invented.

- **World orientation.** `rx = 0.6155` (`atan(1/√2)`, true isometric), `ry` drifting.
- **Per-piece rotation.** Each piece carries whole turns on each axis and a `settle`
  parameter in `[0,1]`. At `settle = 0` it is turned by `turns · 2π`; at `settle = 1` it
  is flush with the lattice. Whole turns, so the resting pose is always axis-aligned —
  that is what makes the cluster read as a cluster instead of as debris.
- **Back-face culling by analytic normal.** The six face normals are constants
  (`(0,0,±1)`, `(0,±1,0)`, `(±1,0,0)`) put through the same rotations as the vertices. A
  face is drawn when `n · (c + (0,0,f)) < 0`, with `c` the face center. Deriving the
  normal from the vertex winding does **not** work: `CUBE_FACES` is not consistently
  wound and the cubes render open-topped.
- **Shading.** `lit = clamp(−n · L)` with `L = (−0.32, −0.86, 0.40)`. Solid faces fill at
  `0.42 + 0.50 · lit`, wireframe faces at `0.02 + 0.06 · lit`. Without this the solid
  cubes are flat hexagonal blobs.

### Colors

`scripts/check-tokens.ts` fails on any `rgba(` or `#hex` under `src/`, so the renderer
never names a color. It follows `network.ts`: the host element carries the tokens as
`color` (accent) and `border-color` (violet), the canvas reads them once per theme change
with `getComputedStyle`, and every alpha goes through `ctx.globalAlpha` — never through a
composed `rgba()` string.

**Light theme.** On `#f4f5f7` the accent loses body. All alphas are multiplied by 1.35 and
solid faces fill opaque. That is a starting value, confirmed against the built page in the
acceptance screenshot, not a measured one: the mark is `aria-hidden` decoration and has no
WCAG floor to clear, so the bar is "reads as a cube", not a ratio.

The build-time SVG bakes the **dark** opacities, because `polyAlpha(poly, false)` runs once
at build and an SVG's `fill-opacity` cannot react to a theme switch. Only the fallback path
is affected — JavaScript disabled, or `prefers-reduced-motion: reduce` — where a light-theme
visitor sees the mark slightly thinner than intended. The canvas, which is what almost every
visitor gets, re-reads the token on every theme change. Accepted rather than fixed: the mark
is `aria-hidden` decoration, and the alternatives are emitting both variants into the markup
or splitting the opacities into per-kind custom properties, neither of which is worth the
weight for a fallback.

## Motion

- Idle: the cluster turns at `2.8·10⁻⁴ rad/ms`; each piece adds
  `sin(t · 6·10⁻⁴ + phase) · 0.1 rad`. Slow enough to be peripheral.
- One shared rAF drives every mounted mark, throttled to 24ms like `network.ts`. An
  `IntersectionObserver` pauses a mark that is off-screen, which is the footer most of the
  time.
- `prefers-reduced-motion: reduce`: no rAF at all. The build-time SVG stays in the DOM and
  the canvas never mounts.
- Hover on the nav brand: `settle` dips to 0.85 and returns over 600ms, so the pieces
  loosen and snap back. Same trigger that already fires the brand scramble.

## Where it renders

`src/components/CubeMark.astro` is the single source. It imports the geometry from
`src/lib/motion/mark.ts` and **projects it at build time** into an inline `<svg>` of
polygons filled with `currentColor` and `var(--color-accent)`. No generated asset, no
build script, no chance of the SVG drifting from the canvas — Astro runs the same module.

The client script replaces the SVG with a `<canvas>` of the same box on mount, unless
`prefers-reduced-motion: reduce`. So:

- **No JS** → the SVG. The mark is in the first paint, at its resting pose.
- **JS** → the canvas takes over and turns.
- **`reduce`** → the SVG, forever.

`Nav.astro` and `Footer.astro` drop their `<span class="glyph">✳</span>` and their local
`think` animation for `<CubeMark size={20} />` and `<CubeMark size={16} />`.

## Files

| File                              | Change                                                                 |
| --------------------------------- | ---------------------------------------------------------------------- |
| `src/lib/motion/mark.ts`          | new — geometry table, seeded LCG, per-piece rotation, projection, draw   |
| `src/components/CubeMark.astro`   | new — build-time SVG at the resting frame, and the mount call           |
| `src/lib/motion/markDraw.ts`      | new — canvas upgrade, shared rAF, IntersectionObserver, hover settle     |
| `src/components/Nav.astro`        | ✳ and its `think` keyframes out, `<CubeMark size={20} />` in            |
| `src/components/Footer.astro`     | same, at 16                                                            |
| `src/styles/app.css`              | `@keyframes think` deleted if nothing else uses it                      |
| `tests/mark.test.ts`              | new — the pure geometry and projection math                             |
| `e2e/nav.spec.ts`                 | extended — mark present without JS, canvas after mount, `reduce` static  |

## Acceptance criteria

These are the tests.

1. `buildMark()` called twice returns deeply equal output. The arrangement is deterministic.
2. Thirty-five pieces at full detail, seventeen below a 24px box: the nine ticks, six
   panels and three corner cubes are the ones dropped.
3. Every cube's center is within `‖p‖∞ ≤ 1`; every panel sits at exactly 1.8 along one
   axis and 0 on the other two; ticks are the only pieces off the lattice.
4. `visibleFaces()` on an axis-aligned cube at the origin returns exactly three of six.
5. At `settle = 1` every piece's rotation is a multiple of `π/2` to within 1e-9 once the
   idle wobble is zeroed. The resting cluster is axis-aligned.
6. `bun run lint` passes: no literal color under `src/`.
7. With JavaScript disabled, `e2e` finds an `<svg>` mark in the nav and in the footer, and
   no `<canvas>` mark.
8. With JavaScript enabled, the nav mark is a `<canvas>` and its pixels change between two
   frames 500ms apart.
9. Under `prefers-reduced-motion: reduce`, the mark is an `<svg>` and no rAF is scheduled.
10. No `✳` anywhere under `src/components/`. The glyph legitimately survives in
    `src/styles/app.css`, `src/lib/motion/math.ts` and `src/lib/motion/network.ts`, which
    describe the node cloud's ✳ formation (`MOTION_SPEC` §3) — a live feature that spec
    [31](./31-entry-choreography.md) replaces, not this one.

## Out of scope

The entry choreography is [31 · Entry choreography](./31-entry-choreography.md)
([PV3-36](https://linear.app/portfolio-djmaam-v3/issue/PV3-36)). Recorded here so the
decisions are not lost between blocks:

- Six overlapping phases in **4.2s**: SEED, EXPAND, DOCK, ENERGY, CONSOLE, CONTENT. The
  phases overlap on purpose — the energy leaves the mark while it is still in flight.
  Sequential phases were 7.2s, which is too long for a first visit.
- **Two canvases, not one.** An overlay canvas above the nav owns SEED → EXPAND → DOCK and
  is destroyed on landing; the node network keeps its own canvas under the content, where
  it is today. With a single canvas the mark is clipped by the nav during the flight, or
  the network paints over the console text.
- The brand name is **not** formed by particles. It resolves in the nav with the existing
  `scramble` (`MOTION_SPEC` §1), which already carries the `min-width: 9.2em` that stops
  the nav from jumping.
- **Skippable.** A click or a scroll during the sequence jumps straight to the end state.
  It runs once per session (`sessionStorage`), not on every ES↔EN navigation.
- The ✳ formation of the node cloud (`MOTION_SPEC` §3, `asteriskTarget` and
  `formationPhase` in `math.ts`) is replaced there, not here.
