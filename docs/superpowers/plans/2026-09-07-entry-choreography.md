# Entry Choreography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The first visit plays a 4.2s entry: the cube mark seeds at the center of the
viewport, expands into its lattice, flies into the nav slot while the brand name scrambles
in, throws energy into the hero that becomes the node cloud, the console rises with its
scan line, and the hero copy cascades last. Interruptible, once per session, and never
under `prefers-reduced-motion: reduce`.

**Architecture:** The same split spec 30 established. `src/lib/motion/entry.ts` is pure —
the phase table and every number the choreography reads — and `bun test` covers all of it
without a DOM. `src/lib/motion/entryDriver.ts` owns the overlay canvas, the rAF loop, the
skip listeners, the `sessionStorage` gate and the teardown. The overlay is a fourth
consumer of `markPolygons` from `mark.ts`; it invents no geometry.

**Tech Stack:** Astro 7 (static), Bun, TypeScript strict, Tailwind v4, `bun test`,
Playwright. No UI framework, no new dependency.

**Spec:** `docs/superpowers/specs/31-entry-choreography.md`
**Prototype:** `docs/prototypes/logo-cube.html` (the choreography section, ~line 1048).

## Global Constraints

- **American English everywhere** — comments, identifiers, commit messages, test names.
- **No literal colors outside `src/styles/app.css`.** The overlay reads the resolved
  `--color-accent` through `getComputedStyle`, like `markDraw.ts` and `network.ts` do.
- **No hardcoded copy.** The brand name comes from the DOM node the nav already renders.
- **One scroll listener for the whole site** (`src/lib/motion/scroll.ts`), and **no
  `resize` listener** — `tests/network.test.ts` asserts it. The entry's skip listener is a
  `scroll` listener on `window`, which would break that test: subscribe through
  `onScroll` instead, and remove the subscription on teardown.
- **Every animation sits behind `prefers-reduced-motion: no-preference`.** With `reduce`
  no `#entry` canvas is ever created.
- **The site must be readable with JavaScript disabled.** The nav mark, the hero copy and
  the console are all in the markup and stay there.
- Branch: `feat/31-entry-choreography`, cut from `feat/30-cube-mark` (PR #27), spec
  committed as `fb2b8d3`. Do **not** rebase onto `main` mid-flight; `mark.ts` and
  `markDraw.ts` only exist on the 30 branch.
- Commands: `bun test`, `bun run lint`, `bun run build`, `bunx playwright test`.
- Kill any stray `astro dev` on port 4321 before running Playwright — the dev toolbar
  injects a second `h1` and `smoke.spec.ts` fails on it (learned in spec 30).

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/motion/entry.ts` | **New.** Pure: `PHASES`, `ENTRY_MS`, `entrySpan`, `phaseAt`, `markTransform`, `entryDelay`, `ENTRY_REVEAL`, `energyParticle`, `consoleEntry`, `cloudFade`. No DOM. |
| `src/lib/motion/entryDriver.ts` | **New.** DOM only: the `#entry` canvas, the rAF loop, the FLIP measurement, the skip listeners, the `sessionStorage` gate, the teardown, the `data-entry` flag. |
| `src/lib/motion/mark.ts` | Modify. `markPolygons` gains a trailing `expand = 1` parameter that scales the piece positions (not their sizes). Default keeps every existing caller identical. |
| `src/lib/motion/math.ts` | Modify. Delete `asteriskTarget`, `formationPhase`, `asteriskRadius`, `easeInOut` and `bootDelay`. |
| `src/lib/motion/network.ts` | Modify. Formation branch out, entry opacity ramp in. |
| `src/lib/motion/boot.ts` | Modify. `entryDelay` instead of `bootDelay`, the reveal duration written inline, and the end state applied at once when the entry is already done. |
| `src/components/Hero.astro` | Modify. Mount the entry before `boot()`; the typed eyebrow starts with the content cascade. |
| `src/components/Console.astro` | Modify. Out of the `[data-boot]` cascade, driven by `consoleEntry`; the `.sweep` keyframe animation becomes a driven offset. |
| `src/components/Nav.astro` | Modify. The load scramble does not fire while the entry owns the brand. |
| `src/styles/app.css` | Modify. `#entry` rule, console resting state, `@keyframes sweep` deleted. |
| `tests/entry.test.ts` | **New.** Acceptance criteria 1–7 and 13. |
| `tests/math.test.ts` | Modify. Six ✳ tests out, the `cloudCenter` test reworded, `bootDelay` test out. |
| `tests/mark.test.ts` | Modify. One test for the new `expand` parameter. |
| `e2e/hero.spec.ts` | Modify. The ✳ test becomes the landing test. |
| `e2e/smoke.spec.ts` | Verify only. It must keep passing unchanged. |

## Design decisions this plan makes, and why

Three of these deviate from the letter of the spec. Say so in the PR description.

1. **`small` is the nav mark's own box, not `navSlotBox.width * 0.3`.** The spec's factor
   comes from the prototype, whose nav slot was a wider container. Acceptance criterion 4
   requires the overlay's last frame to equal the nav canvas' frame; that is only true if
   the overlay lands at exactly `Number(host.dataset.mark)` pixels, which is 20.
2. **`markPolygons` gains an `expand` parameter.** The pieces cannot fly out of a point
   without one — `settle` unwinds their rotation, not their positions, and `scale` moves
   the whole cluster together. `expand` multiplies `piece.pos` only, so at `expand = 0.08`
   the 35 pieces overlap into the seed and at `expand = 1` nothing changes for the three
   existing callers. It is the same lattice, scaled: no new geometry.
3. **The console leaves the `[data-boot]` cascade.** `entryDelay(10, D)` would place it at
   4872ms, past the end of the entry; the spec puts it on the CONSOLE phase instead, and
   criterion 7 asks for a per-frame `consoleEntry(t, D)`. A CSS transition fights per-frame
   inline writes, so the console's resting state moves to a rule with no transition and the
   driver owns its opacity, transform, filter and sweep for the length of the entry.
4. **No links between the energy particles.** The prototype drew them; the real cloud fades
   in over the same window with real connections, so a second link pass is decoration on
   top of decoration. Particles and their arc only.
5. **`document.documentElement.dataset.entry` is the one shared flag.** `'run'` while the
   sequence is in flight, `'done'` once it has ended, skipped or been gated by the session,
   and absent on pages with no hero. `network.ts`, `boot.ts` and `Nav.astro` read it; only
   `entryDriver.ts` writes it. This is why none of them needs a new parameter.

---

## Task 1: The pure choreography (`entry.ts`)

**Files:** `src/lib/motion/entry.ts` (new), `tests/entry.test.ts` (new).

Acceptance criteria 1–7 are the tests. Write the test first, watch it fail, then implement.

### The module

```ts
import { markSpin } from './mark'
import { lerp, type Point } from './math'

export type PhaseName = 'SEED' | 'EXPAND' | 'DOCK' | 'ENERGY' | 'CONSOLE' | 'CONTENT'
export type Phase = { name: PhaseName; from: number; to: number }

/** Fractions of the total duration, so one constant retimes the whole sequence. */
export const PHASES: readonly Phase[]   // the six rows of the spec's table, in order
export const ENTRY_MS = 4200
/** How long a `[data-boot]` element takes to arrive, as a fraction of `D`. */
export const ENTRY_REVEAL = 0.09

export function entrySpan(name: PhaseName, D: number): { from: number; to: number }
/** Progress of one phase in [0, 1] at `t`. 0 before it starts, 1 after it ends. */
export function phaseAt(name: PhaseName, t: number, D: number): number

export type MarkFrame = {
  expand: number
  settle: number
  spinY: number
  center: Point
  scale: number
  alpha: number
}
export function markTransform(
  t: number,
  D: number,
  view: { w: number; h: number },
  nav: { x: number; y: number; box: number },
): MarkFrame

export function entryDelay(n: number, D: number): number
export function energyParticle(
  from: Point,
  to: Point,
  pEnergy: number,
  delay: number,
  h: number,
): Point
export function consoleEntry(
  t: number,
  D: number,
): { opacity: number; translateY: number; scale: number; blur: number; sweep: number }
/** The hero cloud's own fade-in, so the particles arrive as the real nodes resolve. */
export function cloudFade(t: number, D: number): number
```

### The formulas

Private helpers, all four one-liners, copied from the prototype (lines 669–674):

```
clamp01(v)   = min(1, max(0, v))
norm(t, a, b)= clamp01((t - a) / (b - a))
inOut(t)     = t < 0.5 ? 4t³ : 1 - (-2t + 2)³ / 2
outCubic(t)  = 1 - (1 - t)³
outBack(t)   = 1 + 2.70158(t - 1)³ + 1.70158(t - 1)²
```

`markTransform` at `t`, with `pSeed/pExp/pDock` from `phaseAt`:

```
expand = lerp(0.08, 1, outBack(pExp))
settle = outCubic(clamp01((pExp - 0.25) / 0.75))
spinY  = markSpin(t) + (1 - pExp) * 2.4
dock   = inOut(pDock)
center = { x: lerp(view.w / 2, nav.x, dock), y: lerp(view.h * 0.43, nav.y, dock) }
big    = min(view.w, view.h) * 0.19 * 0.85
scale  = lerp(big * lerp(0.25, 1, outCubic(pExp)), nav.box, dock)
alpha  = lerp(0.35, 1, clamp01(pSeed * 2))
```

`entryDelay(n, D) = entrySpan('CONTENT', D).from + n * 0.038 * D`.

`energyParticle`: `e = outCubic(clamp01((pEnergy - delay * 0.5) * 2))`, then

```
x = lerp(from.x, to.x, e)
y = lerp(from.y, to.y, e) - lift          // lift = e >= 1 ? 0 : sin(e·π) * h * 0.12
y = min(h, max(0, y))                      // the arc never leaves the viewport box
```

The `e >= 1 ? 0` is not defensive noise: `Math.sin(Math.PI)` is 1.22e-16, and criterion 6
says the particle ends *exactly* on its target.

`consoleEntry`: `p = outCubic(phaseAt('CONSOLE', t, D))`, then `opacity = p`,
`translateY = (1 - p) * 24`, `scale = lerp(0.96, 1, p)`, `blur = (1 - p) * 10`, and
`sweep = norm(t, from + 0.35 * (to - from), to)` over the CONSOLE span. The sweep window
ends with the phase, so criterion 7's "only during the phase" is literally true.

`cloudFade(t, D) = outCubic(phaseAt('ENERGY', t, D))`.

### Steps

- [ ] Write `tests/entry.test.ts` covering criteria 1–7, one test per criterion where they
      split naturally:
  - `the phase table is ordered and every pair of neighbors overlaps` — for every `i`:
    `PHASES[i].from < PHASES[i].to` and `PHASES[i].to > PHASES[i + 1].from`.
  - `entrySpan scales linearly with the duration` — every boundary at `D = 8400` is twice
    the one at `D = 4200`.
  - `phaseAt is 0 before its phase, 1 after it, and rises in between`.
  - `markTransform starts collapsed at the center of the viewport` — `expand` within 1e-12
    of 0.08, `dock`-driven center equal to `{w / 2, h * 0.43}`.
  - `markTransform lands on the nav slot` — center within 1e-9 of `nav`, `scale` equal to
    `nav.box`, `expand` equal to 1.
  - `the overlay's last frame is the nav canvas' frame` — build
    `markPolygons(nav.box, f.settle, D, f.spinY, f.expand)` from `markTransform(D, ...)`
    and assert it `toEqual` `markPolygons(nav.box, 1, D, markSpin(D))`. Deep equality of
    the two arrays, per criterion 4: do not assert either one's contents.
  - `entryDelay is monotonic and the last reveal finishes inside the entry's tail` —
    `entryDelay(4, D) + ENTRY_REVEAL * D <= D + ENTRY_REVEAL * D`.
  - `energyParticle leaves the mark and lands on its node` — at `pEnergy = 0` it is `from`
    exactly, at `pEnergy = 1` it is `to` exactly, and across 200 samples `0 <= y <= h`.
  - `consoleEntry holds the card until its phase and sweeps once inside it` — opacity 0
    before, 1 after, sweep 0 before the 35% mark, strictly inside (0, 1) only during, 1 at
    the end of the phase and after.
- [ ] Run `bun test tests/entry.test.ts`, confirm it fails for the right reason.
- [ ] Write `src/lib/motion/entry.ts`.
- [ ] Add the `expand` parameter to `markPolygons` in `mark.ts`: signature becomes
      `markPolygons(box, settle, t, spinY, expand = 1)` and the `world` closure uses
      `scale3(piece.pos, expand)` in place of `piece.pos`. Note in the doc comment that the
      entry drives it and that `markScale` still frames the full lattice, which is what
      makes the pieces fly *out of* the seed rather than the box zoom in.
- [ ] Add one test to `tests/mark.test.ts`: `markPolygons collapses the pieces onto the
      center as expand falls` — at `expand = 0.08` the bounding box of every point is
      strictly smaller than at `expand = 1`, and `expand = 1` is identical to the
      four-argument call.
- [ ] `bun test` green, `bun run lint` green.
- [ ] Commit: `feat(entry): the pure choreography (PV3-36)`.

---

## Task 2: Retire the ✳ formation

**Files:** `src/lib/motion/math.ts`, `src/lib/motion/network.ts`, `src/lib/motion/boot.ts`,
`tests/math.test.ts`, `tests/entry.test.ts`.

One commit: the deletions break the build until every caller is updated.

### Steps

- [ ] Delete from `math.ts`: `asteriskTarget`, `formationPhase`, `asteriskRadius`,
      `easeInOut` (nothing else uses it — check first) and `bootDelay`.
- [ ] Delete from `tests/math.test.ts`: `asteriskTarget spreads the nodes over exactly six
      arms`, `asteriskTarget keeps every node inside the radius`, `asteriskTarget is
      symmetric about the center`, `formationPhase walks idle → forming → holding →
      dissolving → idle`, `formationPhase progress never leaves [0, 1] and eases at both
      ends`, `asteriskRadius is 26% of the shorter side of the canvas`, and the `bootDelay`
      test. Reword `cloudCenter with a full pull lands on the console, which is where the ✳
      forms` — `cloudCenter` itself stays; only the name mentions a figure that no longer
      exists. `cloudCenter with a full pull lands on the console itself` will do.
- [ ] `network.ts`: drop the `form` field, the `formationPhase` call, the `formCenter`, the
      `asteriskRadius`/`asteriskTarget` block inside the node loop, and the `if (this.form
      === 0)` guard around the anchors — the anchors now draw every frame. Remove the four
      names from the import list.
- [ ] `network.ts`: add the entry ramp. One field, one read, one multiplication:
      `const entry = document.documentElement.dataset.entry`, and
      `const base = (1 - this.collapse) * (entry === 'run' ? cloudFade(now - this.born, ENTRY_MS) : 1)`.
      Read the dataset inside `draw`, not once in the constructor: the flag flips to
      `'done'` on a skip and the cloud has to come up to full opacity with it.
- [ ] `boot.ts`: `entryDelay(n, ENTRY_MS)` in place of `bootDelay(n)`, and
      `element.style.transitionDuration = `${ENTRY_REVEAL * ENTRY_MS}ms`` on the elements it
      reveals, so the cascade finishes inside the entry instead of 900ms after it. The end
      state is applied at once when `reduced` **or** when
      `document.documentElement.dataset.entry === 'done'` — a second page load in the same
      session must not replay the cascade.
- [ ] Add to `tests/entry.test.ts`: `nothing references the ✳ formation any more` — read
      every file under `src/`, `tests/` and `e2e/` and assert none contains
      `asteriskTarget`, `formationPhase` or `asteriskRadius` (criterion 13). The test file
      itself names them in its own assertion, so exclude it by path, the way
      `tests/tokens.test.ts` scans `app.css`.
- [ ] `bun test` green, `bun run lint` green, `bun run build` green.
- [ ] Commit: `refactor(network): retire the asterisk formation (PV3-36)`.

---

## Task 3: The overlay and the wiring

**Files:** `src/lib/motion/entryDriver.ts` (new), `src/components/Hero.astro`,
`src/components/Console.astro`, `src/components/Nav.astro`, `src/styles/app.css`.

### `entryDriver.ts`

```ts
export function mountEntry(card: HTMLElement): () => void
```

Called from `Hero.astro` — the entry only exists on a page that has a hero — and returns
its teardown. What it does, in order:

1. `if (prefersReducedMotion()) return () => {}`. No flag, no canvas, no listener: the CSS
   resting states are all inside `@media (prefers-reduced-motion: no-preference)`, so the
   page is already in its end state (criterion 9).
2. If `sessionStorage.getItem('pv3-entry')` is set, write `dataset.entry = 'done'`, apply
   the end state once (`consoleEntry(D, D)` on the card, brand text and nav mark visible)
   and return (criterion 11). `boot.ts` reads the same flag and skips its timers.
3. Otherwise `dataset.entry = 'run'`, hide what the overlay is about to own — the nav's
   `[data-mark]` host and `[data-brand-text]` at `opacity: 0` — and create the canvas:
   `id="entry"`, appended to `document.body` (a child of `body`, not of the `z-[1]`
   wrapper, so one `z-index` clears the sticky nav), sized to `innerWidth × innerHeight`
   times a capped `devicePixelRatio`, `aria-hidden="true"`.
4. rAF loop, `FRAME_MS = 24` like `markDraw.ts` and `network.ts`, `t = now - born`:
   - `const f = markTransform(t, D, view, nav)`. Paint
     `markPolygons(f.scale, f.settle, t, f.spinY, f.expand)` translated by
     `f.center.x - f.scale / 2, f.center.y - f.scale / 2`, with `ctx.globalAlpha`
     multiplied by `f.alpha`, reusing `polyAlpha` and `strokeWidth` exactly as
     `markDraw.ts` does. Read the accent once per frame from a cached
     `getComputedStyle(canvas).color`, refreshed by the same `MutationObserver` on
     `data-theme` the other two canvases use.
   - The FLIP target: **measure once**, on the first frame at or after
     `entrySpan('DOCK', D).from`, with one `getBoundingClientRect()` on the nav's
     `[data-mark]`. Cache `{x, y, box}` for the rest of the flight. Until then use the
     resting geometry from the same measurement taken at mount — one read at mount and one
     at DOCK start, never per frame.
   - Energy: on the first frame at or after `entrySpan('ENERGY', D).from`, build the target
     list once — `nodeCountFor(innerWidth)` targets sampled off the hero's own ellipsoid
     with `ellipsoidRadii`, `ellipsoidPoint`, `rotateX`, `projectNode`, `focalLength` and
     `cloudCenter(cardRect, w, h)` from `math.ts`, so the particles land where the cloud
     actually is. Each particle gets a fixed `delay` in [0, 1) from the same index, so the
     cloud fills in instead of arriving as a block. Then per frame:
     `energyParticle(f.center, target[i], pEnergy, delay[i], view.h)`, a 1.5px dot at
     `0.75 * e` alpha. No links between them.
   - The console: write `consoleEntry(t, D)` onto the card every frame — `opacity`,
     `transform: translateY(...) scale(...)`, `filter: blur(...)`, and
     `--sweep: <percent>` plus `--sweep-a: 0 | 1`.
   - The brand: once, on the first frame at or after
     `from + 0.62 * (to - from)` of DOCK, set `[data-brand-text]` back to `opacity: 1` and
     call `scramble(brandText, 0.16 * D)` — the existing implementation, only its trigger
     moves here. Reveal the nav's `[data-mark]` host on the same frame: `dock` is 1 by
     then, so the overlay's mark and the nav canvas' mark are the same picture in the same
     place (criterion 4), and the swap is invisible.
   - When `t >= D`: paint the final frame, then `end()`.
5. `end()`: `sessionStorage.setItem('pv3-entry', 'done')`, `dataset.entry = 'done'`, cancel
   the rAF, disconnect the observer, remove both listeners, remove the canvas, restore any
   opacity the overlay was holding down.
6. Skip: a `click` on `window` and the site's shared `onScroll` subscription both call
   `skip()`, which sets `t = D`, paints one final frame and calls `end()` — the end state
   is not written twice, it is `t = D` applied once (criterion 10). Do **not** add a
   `window.addEventListener('scroll', ...)`: `tests/network.test.ts` asserts `scroll.ts` is
   the only module that does.

### The components and the stylesheet

- [ ] `app.css`: add the `#entry` rule next to `.hero-net` — `position: fixed; inset: 0;
      z-index: 30; pointer-events: none;` and `color: var(--color-accent)` so the canvas can
      read the accent back like the other two. It is created by JS and never
      server-rendered, which is why the rule lives here and not in a component.
- [ ] `app.css`: the console's resting state. `[data-boot][data-console]` goes away with
      `data-boot`; add `.has-js [data-console] { opacity: 0 }` inside the same
      `no-preference` media block, with **no transition** — the driver writes it per frame.
      Delete `@keyframes sweep`.
- [ ] `Console.astro`: drop `data-boot="10"` (keep `data-console`), and replace the
      `.sweep` animation with the driven offset: `top: var(--sweep, -8%)` and
      `opacity: var(--sweep-a, 0)`. The scan line is now a position the driver writes, not a
      keyframe with a fixed delay.
- [ ] `Hero.astro`: `mountEntry(card)` **before** `boot()` — `boot()` reads the
      `data-entry` flag the driver has just written. Replace the typed eyebrow's hardcoded
      700ms offset with `entryDelay(0, ENTRY_MS)` when the entry is running (the eyebrow is
      `data-boot="0"`, so the typing starts as it is revealed) and 0 when it is not.
- [ ] `Nav.astro`: wrap the load scramble in
      `if (document.documentElement.dataset.entry !== 'run')`. The 9s interval and the
      hover scramble stay exactly as they are.
- [ ] `bun test`, `bun run lint`, `bun run build` green.
- [ ] Verify by eye at `bun run dev`: both themes, a reload (no overlay the second time),
      a new session (overlay again), a click mid-flight, and `reduce` forced in devtools.
- [ ] Commit: `feat(entry): the overlay canvas and the choreography driver (PV3-36)`.

---

## Task 4: The e2e gate

**Files:** `e2e/hero.spec.ts`, and whatever the run turns up.

- [ ] Replace `the ✳ forms on the console and clears the H1, like the mock` with `the mark
      lands on the nav slot and the overlay is destroyed`: wait for `#entry` to exist, wait
      for it to be removed (`ENTRY_MS` plus a margin), then assert the nav's `[data-mark]`
      canvas is painted — a non-zero alpha sum in its own `getImageData` — and that the
      `[data-brand-text]` reads the resolved name.
- [ ] Add `a click during the entry destroys the overlay and leaves the hero in its end
      state` (criterion 10): open, wait for `#entry`, `page.mouse.click(...)`, assert the
      canvas is gone within ~2 frames and the H1 is at `opacity: 1`.
- [ ] Add `the entry runs once per session` (criterion 11): open, let it finish, reload,
      assert `#entry` never appears and the hero is visible immediately.
- [ ] Confirm criterion 12 by running the existing no-JS assertions: nav mark, hero copy
      and console all present.
- [ ] `bunx playwright test` fully green (48+ tests). Kill any stray dev server first.
- [ ] Re-measure the frame cost with three canvases live, as the spec's "accepted, not
      fixed" section asks: sample `performance.now()` around the overlay's `draw` for its
      first 60 frames and report the median in the PR body. Spec 30 measured the marks at
      ~0.4% of one core; this is the number that says whether that still holds.
- [ ] Commit: `test(entry): the landing, the skip and the session gate (PV3-36)`.

---

## Ship gate

- [ ] `bun test` — every unit test.
- [ ] `bun run lint` — eslint, prettier, `check-tokens`.
- [ ] `bun run build` — static build clean.
- [ ] `bunx playwright test` — every e2e test.
- [ ] Request a code review, apply what survives scrutiny.
- [ ] Open the PR against `feat/30-cube-mark`'s PR #27 base, note the four deviations
      above and the measured frame cost, and move PV3-36 to In Review.
