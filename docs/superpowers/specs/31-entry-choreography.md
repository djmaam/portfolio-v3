# 31 · Entry choreography: the mark expands, docks and seeds the network — spec

Issue: [PV3-36](https://linear.app/portfolio-djmaam-v3/issue/PV3-36) ·
Branch: `feat/31-entry-choreography`
Design: this spec · prototype at
[`docs/prototypes/logo-cube.html`](../../prototypes/logo-cube.html) ·
`handoff/MOTION_SPEC.md` §2 and §3

> [!IMPORTANT]
> **Depends on [30 · Cube mark](./30-cube-mark.md)** ([PV3-35](https://linear.app/portfolio-djmaam-v3/issue/PV3-35), PR #27).
> This branch is cut from `feat/30-cube-mark`, not from `main`. Everything below assumes
> `src/lib/motion/mark.ts` and `src/lib/motion/markDraw.ts` exist. If 30 has merged, rebase
> onto `main` first and nothing else changes.

> [!NOTE]
> **Documented deviation from `handoff/MOTION_SPEC.md` §2 and §3.** §2 boots the hero at
> `500 + n·170 ms` with the console at 2200; §3 has the node cloud converge into a
> six-armed ✳ from 300 to 2800ms. Both are replaced here. `handoff/` is read-only and
> stays as it is.

## Goal

The first thing a visitor sees is the cube mark, collapsed, alone in the middle of the
screen. It expands — every piece turning onto its lattice position — then shrinks and flies
into the nav, where the brand name resolves beside it. Energy trails out of it, falls into
the hero, and becomes the node network, which anchors onto the console as the console
arrives. The hero copy cascades last.

Six phases, **4.2 seconds**, and they overlap.

## The sequence

Phase bounds are fractions of the total duration `D`, so one constant retimes everything.
Milliseconds below are at `D = 4200`.

| Phase | Fraction | ms | What happens |
| --- | --- | --- | --- |
| SEED | 0 – 0.095 | 0 – 399 | A point of light. The core breathes, collapsed at the center of the viewport. |
| EXPAND | 0.09 – 0.38 | 378 – 1596 | The pieces fly out, each unwinding whole turns on its own axes, and lock into the lattice. |
| DOCK | 0.355 – 0.57 | 1491 – 2394 | The cluster shrinks and flies to the nav slot. The brand name scrambles in as it lands. |
| ENERGY | 0.52 – 0.76 | 2184 – 3192 | Particles leave the mark on an arc and become the node cloud. |
| CONSOLE | 0.69 – 0.88 | 2898 – 3696 | The console rises, the scan line crosses it, the cloud's anchors wire up. |
| CONTENT | 0.78 – 1 | 3276 – 4200 | Eyebrow, H1, sub, CTAs and stats, cascading. |

**The overlap is the design, not a rounding artifact.** Sequential phases came to 7.2s in
the prototype, which is too long for a first visit. Energy leaves the mark while it is
still in flight; the console arrives while the cloud is still assembling. Below `D = 3200`
the EXPAND stops reading; above `D = 5000` the site feels like it is making you wait.

## Two canvases

The single most important structural decision, and the one the prototype had to discover:

- **`#entry`** — a new full-viewport canvas, `position: fixed`, above the nav. It owns
  SEED, EXPAND, DOCK and the ENERGY particles. It is **removed from the DOM** when the
  sequence ends.
- **The hero canvas** — `network.ts`, unchanged in ownership, below the content, where it
  already is. It owns the node cloud forever.

With one canvas the mark is clipped by the nav during its flight, or the node cloud paints
over the console's text. There is no z-index that satisfies both.

### The handover is an opacity ramp, not a transfer

The ENERGY particles are decoration drawn on the overlay. They do **not** become the real
nodes. `network.ts` keeps owning its cloud and simply fades in over the same window, so the
particles arrive as the cloud resolves. This keeps the diff in `network.ts` to an opacity
ramp plus the deletion of the ✳ formation, instead of a second implementation of the node
system living in the overlay.

## The mark across the timeline

`p<PHASE>` below is that phase's progress in `[0, 1]`. Easing: `outBack` for the expansion
(the pieces overshoot slightly and settle), `outCubic` for the growth, `inOut` for the
flight.

```
expand  = lerp(0.08, 1, outBack(pEXPAND))
settle  = outCubic(clamp((pEXPAND - 0.25) / 0.75))
spinY   = markSpin(t) + (1 - pEXPAND) * 2.4
dock    = inOut(pDOCK)
center  = lerp(viewportCenter, navSlotCenter, dock)
scale   = lerp(big * lerp(0.25, 1, outCubic(pEXPAND)), small, dock)
```

with `big = min(W, H) * 0.19 * 0.85` and `small = navSlotBox.width * 0.3`, both taken from
the prototype's settled knob values.

`markSpin`, `pieceRotation`, `idleWobble` and `markPolygons` all come from `mark.ts`
unchanged — spec 30 already made `settle` and `spinY` parameters for exactly this. The
overlay is a fourth consumer of the same `MarkPoly[]`; it introduces no geometry of its own.

**The FLIP target is measured once, at the start of DOCK** — one `getBoundingClientRect` on
the nav's `[data-mark]` span, cached for the rest of the flight. Not per frame: this
project allows one scroll listener and no `resize` listener (`tests/network.test.ts`
enforces the latter), and a layout read per frame is the thing that rule exists to prevent.

**The landing must be exact.** At `dock = 1` the overlay's frame has to equal what
`markDraw.ts` paints in the nav, or the mark jumps when the overlay is destroyed — the same
defect that survived fourteen commits in spec 30 and was caught in its final review. The
overlay's last frame and the nav canvas' first frame both resolve through
`restingPolygons`-equivalent arguments, and an acceptance test pins it.

## Skipping

The sequence is **interruptible and runs once per session**.

- A `click` or a `scroll` anywhere during the sequence jumps straight to the end state:
  one final frame at `t = D`, then teardown.
- On completion or skip, `sessionStorage.setItem('pv3-entry', 'done')`. If that key is
  present at load, the whole thing is skipped — the end state applies on the first frame.
  This is per session, not per page load, so navigating between `/` and `/en` does not
  replay it.
- With `prefers-reduced-motion: reduce`, the overlay is never created and the end state
  applies on the first frame, exactly as `boot.ts` already behaves.
- With JavaScript disabled nothing changes from today: the nav's inline SVG mark, the hero
  copy and the console are all in the markup.

The end state is not a special case to write twice. It is `t = D` applied once.

## What this replaces

**The ✳ formation of the node cloud.** `MOTION_SPEC` §3's convergence is what the cube's
expansion now does, better and with the real mark. Delete from `src/lib/motion/math.ts`:
`asteriskTarget`, `formationPhase`, `asteriskRadius`, and `easeInOut` if nothing else uses
it. `network.ts` loses its `form`/`born` formation branch and gains the entry opacity ramp.

Seven unit tests go with them — `asteriskTarget spreads the nodes over exactly six arms`,
`asteriskTarget keeps every node inside the radius`, `asteriskTarget is symmetric about the
center`, `formationPhase walks idle → forming → holding → dissolving → idle`,
`formationPhase progress never leaves [0, 1] and eases at both ends`, `asteriskRadius is
26% of the shorter side of the canvas` in `tests/math.test.ts`, and
`cloudCenter with a full pull lands on the console, which is where the ✳ forms`, whose name
needs rewording since `cloudCenter` itself stays.

One e2e test goes with them: `the ✳ forms on the console and clears the H1, like the mock`
in `e2e/hero.spec.ts`. Its replacement asserts the mark lands on the nav slot instead.

**The boot timing.** `bootDelay(n) = 500 + n·170` in `math.ts` is replaced by
`entryDelay(n, D) = 0.78·D + n·0.038·D`, with the reveal transition at `0.09·D`. At
`D = 4200` that is 3276, 3436, 3595, 3755, 3915ms, the last finishing at 4293. `boot.ts`
keeps its shape — sort by `data-boot`, reveal on a timer, apply immediately under `reduce`.

**The console's fixed sweep delay.** `Console.astro` animates `.sweep` with a hardcoded
`1.1s` delay and sits at `data-boot="10"`. Both become driven by the choreography: the card
enters over the CONSOLE phase and the sweep starts 35% into it.

## New modules

Mirroring the split spec 30 established, and for the same reason — the math has to be
reachable by `bun test` without a DOM:

| File | Responsibility |
| --- | --- |
| `src/lib/motion/entry.ts` | **Pure.** The phase table, `phaseAt`, `entrySpan`, `markTransform`, `entryDelay`, `energyParticle`, `consoleEntry`. No DOM. |
| `src/lib/motion/entryDriver.ts` | DOM plumbing: the overlay canvas, the rAF loop, the skip listeners, the `sessionStorage` gate, the teardown. |

`entry.ts` imports from `mark.ts` and `math.ts`; it adds no geometry and no easing that
either already exports.

## Acceptance criteria

These are the tests.

1. The phase table's fractions are ordered, each phase's `from < to`, and consecutive phases
   overlap — `PHASES[i].to > PHASES[i + 1].from` for every `i`.
2. `entrySpan(i, D)` scales linearly with `D`: doubling `D` doubles every boundary.
3. `markTransform` at `t = 0` is the collapsed state (`expand ≈ 0.08`, `dock = 0`), and at
   `t = D` it is the docked state (`expand = 1`, `dock = 1`, center equal to the supplied
   nav slot center to within 1e-9).
4. The landing is exact. At `t = D`, `markTransform` yields `settle = 1` and a `spinY`
   equal to `markSpin(D)`, so the overlay's last frame and the nav canvas' frame at the
   same clock reading are the same `MarkPoly[]`. Assert the two arrays are deeply equal
   rather than asserting either one's contents.
5. `entryDelay(n, D)` is monotonic in `n`, and the last element's reveal finishes within
   `D + 0.09·D`.
6. `energyParticle` starts at the mark's live center and ends exactly on its target node
   position; its arc never leaves the viewport box.
7. `consoleEntry` returns `opacity: 0` before the CONSOLE phase and `opacity: 1` after it,
   with the sweep offset inside `[0, 1]` only during the phase.
8. `bun run lint` passes: no literal color under `src/`, and no second `resize` listener.
9. With `prefers-reduced-motion: reduce`, no `#entry` canvas is ever created and the hero
   content is visible on the first frame. `e2e/smoke.spec.ts` already asserts no canvas
   mounts under `reduce`; it must keep passing.
10. A `click` during the sequence removes the `#entry` canvas within one frame and leaves
    the hero in its end state.
11. A second page load in the same session shows no overlay at all.
12. With JavaScript disabled, the nav mark, the hero copy and the console are all present —
    unchanged from today.
13. No reference to `asteriskTarget`, `formationPhase` or `asteriskRadius` remains anywhere
    under `src/`, `tests/` or `e2e/`.

## Accepted, not fixed

- **A third canvas exists during the entry.** The overlay, the node cloud and the two nav
  and footer marks all animate for those 4.2 seconds. The overlay is destroyed afterwards.
  Spec 30 measured the marks at roughly 0.4% of one core against a node cloud already
  running an O(n²) pass over 3486 pairs per frame; re-measure once this lands rather than
  assuming it still holds.
- **The mark's light-theme fallback stays thin.** Inherited from spec 30 and documented
  there: the build-time SVG bakes the dark opacities. The entry overlay is a canvas and
  reads the theme correctly, so this only affects the `reduce` and no-JS paths, where the
  overlay does not run anyway.
