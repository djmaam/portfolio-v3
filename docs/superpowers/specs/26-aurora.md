# 26 · Aurora: hue capped in the cyan-violet family, calm footer — spec

Issue: [PV3-31](https://linear.app/portfolio-djmaam-v3/issue/PV3-31) ·
Branch: `feat/26-aurora`
Design: `handoff/MOTION_SPEC.md` §4

> [!NOTE]
> Retunes the aurora shipped with [03 · Base layout](./03-base-layout.md). This is a
> **documented deviation from `MOTION_SPEC` §4**, not a bug fix — see below.

## The defect

Scrolling down, a soft olive-green stain grows behind the content and dominates the
contact section and the footer. It reads as a stray shadow. It is the aurora.

`src/lib/motion/math.ts` today:

```ts
export function auroraStyle(p: number) {
  return {
    filter: `hue-rotate(${Math.round(p * 260)}deg) saturate(${round(1 + 0.4 * p, 3)})`,
    opacity: 0.45 + 0.55 * Math.min(1, p * 2.5),
    translateY: `${round(-12 * p)}vh`,
  }
}
```

Two things compound.

**The hue leaves the palette.** The blobs are painted with `--color-accent` (hue ≈ 191°
light, 188° dark) and `--color-violet` (≈ 251° light, 262° dark). A 260° rotation takes
the accent round to ≈ 88° — yellow-green — over the second half of the document.

**The opacity ramp tops out too early.** `min(1, p · 2.5)` reaches 1.0 at `p = .4`, so
the layer runs at full strength for the entire second half of a page that is much longer
than the mock's. Measured at the bottom of the document: `opacity: 1`,
`hue-rotate(260deg)`, and the contact card sits on top of the result.

## Why this deviates from `MOTION_SPEC` §4

`MOTION_SPEC` §4 does specify `hue-rotate(p·260deg)` and `opacity .45 → 1` in the first
40%. The implementation was faithful. The spec is `handoff/`, read-only, and stays as
written; what did not survive contact with the real page is the spec itself: the mock's
scroll never reached high `p` with three full sections still below the fold.

The call, recorded here rather than applied silently:

- **The hue sweep is capped at 50°**, so every blob stays inside the cyan → violet →
  magenta arc the palette owns (resolved range ≈ 188°–312°) and never reaches green or
  amber. The direction of §4 is kept, its magnitude is not.
- **The opacity peaks at .8 instead of 1.0**, and **eases back down to .55 over the last
  30%** of the document, so the contact card and the footer sit on a calm background
  instead of the layer's loudest frame. The peak is what the contrast measurement below
  allows, not a round number: at .85 the footer's `--color-dim` reads 4.42:1 in the dark
  theme.
- **The light theme runs the blobs at roughly 40% of §4's alphas** — 8%/5%/4% instead of
  22%/14%/12% — because over a near-white `--color-bg` §4's values cost the footer text
  its WCAG ratios outright. See "Contrast" below.

`saturate(1 + .4p)` and `translateY(-12vh · p)` are unchanged.

## The curve

```ts
const AURORA_HUE_SWEEP = 50
const AURORA_CALM_FROM = 0.7

export function auroraStyle(p: number) {
  return {
    filter: `hue-rotate(${Math.round(p * AURORA_HUE_SWEEP)}deg) saturate(${round(1 + 0.4 * p, 3)})`,
    opacity: round(
      0.45 + 0.35 * Math.min(1, p * 2.5) - 0.25 * Math.max(0, (p - AURORA_CALM_FROM) / 0.3),
      3,
    ),
    translateY: `${round(-12 * p)}vh`,
  }
}
```

| `p`  | `hue-rotate` | `opacity` | `translateY` |
| ---- | ------------ | --------- | ------------ |
| 0    | 0°           | .45       | 0vh          |
| 0.2  | 10°          | .625      | -2.4vh       |
| 0.4  | 20°          | .8        | -4.8vh       |
| 0.7  | 35°          | .8        | -8.4vh       |
| 1    | 50°          | .55       | -12vh        |

`hue-rotate` is a matrix approximation, not a rotation in HSL, so the nominal 50° is not
what the pixels do. Measured end to end, from the tokens in `app.css`:

| blob token        | theme | rested | at `p = 1` |
| ----------------- | ----- | ------ | ---------- |
| `--color-accent`  | light | 192°   | 230°       |
| `--color-accent`  | dark  | 187°   | 211°       |
| `--color-violet`  | light | 251°   | 308°       |
| `--color-violet`  | dark  | 262°   | 316°       |

Every value stays inside the cyan → violet → magenta arc, and the furthest, 316°, is
still short of red. §4's 260° put the accent at ~88°.

The ramp up and the ramp down are two independent linear terms rather than one piecewise
function: they overlap nowhere (`.4 < .7`), and a sum of clamped ramps is easier to test
at a point than a chain of `if`s.

## Contrast

The aurora is decoration and must not cost contrast. Two facts bound the risk:

- The contact card paints `background: var(--color-contact-card)`, which is **opaque** in
  both themes, so nothing the aurora does reaches the text inside it.
- The footer paints no background of its own, so `--color-dim`, `--color-ink` and
  `--color-accent` there sit on `--color-bg` **with the aurora composited on top of it**.

`tests/contrast.test.ts` therefore composites the worst case and re-runs the footer's
ratios against it. The worst case is **two** blobs, not three: horizontally they span
55–111vw, 20–64vw and 70–106vw, so every pair overlaps but no band of the viewport is
under all three. Each pair is composited at every point of the sweep, with the CSS
`hue-rotate` and `saturate` matrices actually applied and the layer's group opacity on
top, and the frame that moves the background furthest from `--color-bg` is the one the
ratios are measured against.

Measured there, with the curve above:

| theme | `dim` (≥4.5) | `ink` (≥4.5) | `accent` (≥3) |
| ----- | ------------ | ------------ | ------------- |
| light | 4.70         | 15.82        | 3.07          |
| dark  | 4.56         | 12.72        | 9.31          |

The light theme is why the blob alphas moved. At §4's 22%/14%/12% the same measurement
reads **3.76 / 2.46** — under both thresholds — and it read 3.55 / 2.32 with the old
curve, so this was already broken before this issue and the hue cap alone does not fix
it. No hue and no opacity ceiling rescues it either: the light `--color-dim` and
`--color-accent` only clear 5.30:1 and 3.46:1 on the bare background, so a cyan wash of
that strength eats the whole margin. Dropping the light blobs to 8%/5%/4% is what buys it
back. The dark theme keeps §4's alphas.

## The second defect: the layer's clip box travels with it

Found while validating the retune. A dark, hard-edged band grows along the bottom of the
viewport as you scroll, and disappears when you go back to the top.

`.aurora` is `position: fixed; inset: 0; overflow: hidden`, and §4 drives
`transform: translateY(-12vh · p)` on it. A transform moves the element **and its overflow
clip box**, so the bottom `12vh · p` of the viewport falls outside the box and paints no
aurora at all — an untinted strip whose top edge is the clip rectangle, not a blur. It
grows from 0 to 108px at 900px tall, and unwinds on the way back up. Measured on the
built page: `getBoundingClientRect()` on the layer reads `bottom = 792` in a 900px
viewport at `p = 1`.

Independent of hue and opacity, and older than this issue — it is `translateY` that
causes it, and `translateY` is unchanged.

The fix is one declaration: `inset: 0 0 -13vh 0`, so the layer hangs below the viewport
by more than the travel and the clipped edge never enters view. 13 rather than 12 because
the two `vh` lengths round independently: at exactly 12 the box lands 0.01px short.

`e2e/layout.spec.ts` asserts it where it can be seen — at full scroll, with the drift
applied, the layer's rect still covers the viewport top to bottom. A stylesheet reads
correct either way; only a layout engine can say where the box actually is.

## Acceptance criteria

- [ ] `auroraStyle` is unit-tested at `p = 0, .2, .4, .7, 1` against the table above, in
      `tests/math.test.ts`, with no DOM.
- [ ] The resolved hue of every blob, at every point of the sweep, is asserted to stay in
      the cyan-violet-magenta arc and out of the green/amber band — computed from the
      tokens in `app.css` and the CSS filter matrices, not eyeballed.
- [ ] Footer `dim` and `ink` clear 4.5:1, and `accent` clears its large-text 3:1, over the
      aurora at its strongest, in both themes.
- [ ] The deviation from `MOTION_SPEC` §4 is recorded — this file.
- [ ] The layer covers the viewport at every point of the scroll — asserted on the
      rendered page, in `e2e/layout.spec.ts`, not in the stylesheet.
- [ ] `bun run build && bun test && bun run lint` green; Lighthouse accessibility does not
      drop.
