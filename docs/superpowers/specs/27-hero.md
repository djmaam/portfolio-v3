# 27 · Hero: close the gap to the mock — spec

Issue: [PV3-32](https://linear.app/portfolio-djmaam-v3/issue/PV3-32) · Branch: `feat/27-hero`
Design: `handoff/DESIGN_SPEC.md` §2 · `handoff/MOTION_SPEC.md` §3 · `handoff/reference/Portfolio.dc.html`

## Goal

Finish matching the hero to the mock. Three complaints were filed against the pre-19
build: the hero was 85px too tall and cut the stats row off at the fold, the node cloud
weighted to the bottom, and the ✳ formation landed on top of the H1.

Two of the three closed on their own when spec 19 landed. The third did not, and it turns
out not to be a timing problem at all.

## Measured

Everything below is Chromium at 1512×950, dark, `deviceScaleFactor: 1`, seven seconds
after load. The mock is `handoff/reference/Portfolio.dc.html` opened over `file://` and
probed through its own DOM; "ours" is the static build served by `astro preview`.

|                         | Mock             | Before 19        | After 19 (today)  | Verdict            |
| ----------------------- | ---------------- | ---------------- | ----------------- | ------------------ |
| Hero height             | 909              | 994              | **918** (+1.0%)   | closed by 19       |
| Hero top                | 63               | —                | **64**            | closed by 19       |
| H1                      | 564 × 296        | 516 × 380        | **564 × 304**     | closed by 19       |
| Stats row bottom        | 862              | cut by the fold  | **872**           | closed by 19       |
| Console card            | 564 × 366 @ y350 | 509 wide         | 564 × 332 @ y372  | out of scope       |
| Canvas box              | 0..950 (1512×950) | —               | **64..982 (1512×918)** | **fix**       |
| Mask fade starts at     | y = 523          | —                | **y = 569**       | **fix**            |
| Cloud center − console  | +80 (−5..+145)   | —                | +68 (−29..+114)   | already equal      |
| ✳ center x              | **1072**         | —                | **862**           | **fix**            |
| ✳ overlaps the H1       | no (starts x803) | yes              | **yes (x671)**    | **fix**            |

### What issue 19 already closed

The hero is 918px against the mock's 909 — 1.0%, inside the 5% the acceptance criteria
ask for — and the stats row now ends at y=872, clearing a 950px fold by 78px. Neither
needs any work. The `padding-block: clamp(72px,10vw,140px) clamp(64px,8vw,110px)` and the
28px column gap the brief pointed at turn out to be **already identical to the mock**: the
mock writes the same clamps in `cqw` against a 1512px container, so all four resolve to
the same 140/110/72/28 at this viewport. The remaining 9px is the H1's 8px of line-height
rounding. Nothing to change.

### The node cloud is not low — that measurement was noise

The cloud's brightness-weighted vertical center was measured straight off the canvas'
`ImageData` (alpha per row, averaged over ten frames), which sidesteps the aurora and the
live console. A single run said our cloud sat 145px below the console against the mock's
+24, which looks damning. Over six loads each it is:

```
MOCK  +112 +62 +75 +93 +145  -5    mean +80
OURS   +66 +114 +76 -29  +92 +89   mean +68
```

84 nodes drawn from `Math.random()` put the center of mass anywhere in a ±140px band, in
the mock exactly as much as in ours. Our cloud already tracks the console as closely as
the reference does, and no per-frame pixel assertion of it could ever be stable. The
assertion this spec adds instead is on the geometry the cloud is derived from, which is
deterministic.

### The mask does work on a canvas element

The brief asked whether `mask-image` is honored on a `<canvas>`. It is. Screenshotting the
page, then again with `maskImage: 'none'`, and differencing against a canvas-hidden
baseline, band by band:

```
page y     masked   unmasked
   813      0.195      0.501
   861      0.033      0.369
   910      0.006      0.182
```

Below 55% of the canvas the mask removes ~90% of the ink. It was never broken.

### The ✳ is centered on the wrong point

At t=1500ms `form` is 1, so every node sits exactly on the ✳ and its center is exact —
no sampling noise. The mock puts it at x=1072; the console's center is x=1074. We put it
at x=862; our *cloud's* center is x=867.

`MOTION_SPEC` §3 says the ✳ is "centrado en la consola". The mock obeys it literally:

```js
let x = W*.5 + (cx - W*.5)*.35 + x3*sc + n.ox      // cloud: 35% of the way to the console
...
const fx = cx + Math.cos(n.fa) * n.fr * R          // ✳: all the way to the console
```

Ours reuses the damped cloud center for both, so the ✳ forms 210px to the left of where
the design puts it. With a radius of ~239 that drags its left arm to x=671, and the H1
ends at x=720 — which is the "dense cluster of large rings sitting on top of the H1" in
the 2.5s screenshot. The mock's ✳ starts at x=803 and never touches the headline.

## Scope

### 1. The ✳ is centered on the console

`cloudCenter` gains a `pull` argument, defaulting to the 0.35 it already applies. The
formation asks for `pull = 1`. One parameter, one extra call site; the cloud keeps its
damped center, the ✳ gets the console's.

This is also the answer to the formation-timing question the brief asks. Our phases are
`300 → 1200` converge, hold to `1900`, dissolve `1900 → 2800` — byte for byte the mock's
own `el_ < 300 ? 0 : el_ < 1200 ? ease(...) : el_ < 1900 ? 1 : el_ < 2800 ? 1 - ease(...) : 0`.
The beat is right and stays untouched. The mid-dissolve frame reads badly only because it
is drawn in the wrong place, and the mock proves it: same timing, same radius, no overlap.
Fixing the center fixes the frame; changing the timing would have moved us *away* from
the reference.

### 2. The canvas is the viewport box, as `MOTION_SPEC` §3 says

The spec opens with "Canvas absoluto, 100vw × 100vh". The mock does exactly that —
`position:absolute; top:0; width:100%; height:100vh` on the page root, so its canvas is
`0..950`. Ours is `inset: 0` on `.hero`, so it is `64..982`: it starts below the nav,
ends 32px below the fold, and — the part that matters — **its height is the hero's**.

Every number the cloud is built from divides by that height: `ry = .48h`, the ✳ radius
`.26·min(w,h)`, and the 55% mask cut. Tying them to a section that re-flows is the drift
channel the acceptance criteria want shut, and it is why the mask ramp starts 46px lower
than the mock's.

`.hero-net` moves to `top: calc(-1 * var(--nav-h)); height: 100vh`. `--nav-h` is an
existing token and the nav is `position: sticky` with that exact height in flow, so this
lands the canvas at page y=0 — the mock's box, to the pixel. The nav keeps `z-index: 20`
against the hero's `auto`, so it still paints and hits-tests above the canvas, exactly as
the mock's header does over its own.

Two consequences in `network.ts`:

- `measure()` walks `offsetTop` to the section, which stops being canvas-space once the
  canvas is offset from it. The card's offsets are converted into canvas coordinates.
- The canvas' size no longer changes when the hero re-flows, so the `w === this.w` guard
  that caches the card would miss a font swap. The card is re-measured once on
  `document.fonts.ready`. The per-frame cost is unchanged — still no measuring in `draw`.

### 3. What is deliberately not touched

- **Hero padding, the column gap, the ellipsoid formula, `asteriskTarget`, the formation
  timing.** All measured equal to the mock; the brief's instruction was to not invent work
  where the gap has closed.
- **The console card is 332 tall against the mock's 366.** Real, and `Console.astro` is
  outside this issue's files. Reported, not fixed.
- **`auroraStyle`** — a separate pending issue.

## Acceptance criteria

- [ ] The hero's height is within 5% of the mock's 909 at 1512×950, and the stats row's
      bottom is above a 950px fold. Asserted against the mock's numbers.
- [ ] The canvas is the viewport box — 100vw × 100vh at page y=0 — so its height cannot
      follow the hero's. Asserted as a box, in page coordinates.
- [ ] The cloud's center tracks the console's: `cloudCenter` computed from the live DOM
      lands within a pixel of the console card's own center, vertically. Asserted from
      geometry, not from pixels, because the pixel center of 84 random nodes is ±140px
      noise in the mock too.
- [ ] The mask is asserted to be applied: node ink below 55% of the canvas is measurably
      lower than the same canvas with `maskImage: none`.
- [ ] The ✳ forms centered on the console, and its left edge clears the H1's right edge —
      the mock's behavior, asserted at t≈1500ms while `form` is 1.
- [ ] `cloudCenter(rect, w, h, 1)` returns the console's center undamped, and the default
      argument keeps every existing caller on 0.35.
- [ ] `prefers-reduced-motion: reduce` still creates no canvas, and the hero still reads
      with JavaScript disabled. Both already covered — `tests/network.test.ts`,
      `e2e/smoke.spec.ts`, `tests/a11y.test.ts` — and must stay green untouched.
- [ ] The canvas stays `aria-hidden` with `pointer-events: none`, and every animation
      stays inside a `no-preference` block.
- [ ] `bun test`, `bun run lint`, `bun run build` and the Playwright suite all pass.

## Out of scope

The console card's height (`Console.astro`, another issue's file). The nav's alignment
(issue 20). `auroraStyle`. Any visual-regression tooling: `e2e/hero.spec.ts` asserts hero
geometry invariants against the mock's numbers, in the spirit of `e2e/layout.spec.ts`, and
is not a screenshot suite.
