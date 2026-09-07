# 23 · Experience: dot alignment and the "also with" row — spec

Issue: [PV3-28](https://linear.app/portfolio-djmaam-v3/issue/PV3-28) · Branch: `feat/23-experience`
Design: `handoff/DESIGN_SPEC.md` §5 · `handoff/reference/Portfolio.dc.html`

> [!NOTE]
> Refines the initial timeline component from [10 · Experience](./10-experience.md).

## Goal

Fix two rendering defects in `src/components/Experience.astro`, the "how I work"
timeline's neighbor section: the rail dot is not centered on the company it marks, and
the "TAMBIÉN CON" / "ALSO WITH" companies render as a vertical list instead of a row.

## Context

### Defect 1 — the dot

`.rail::before` draws a 1px vertical line spanning the full height of each `.job` grid
row; `.dot` sits on top of it, its ring (`box-shadow: 0 0 0 4px var(--color-bg)`) hiding
the line behind it. The dot is positioned with a single hand-picked number:

```css
.dot {
  margin-top: 28px;
}
```

28px does not come from anywhere — it was eyeballed against the card, not derived from
what the dot is supposed to mark: the vertical center of `.who`, the row holding the
56px `.logo` and the company name. `.who` sits right after the card's own padding and
border, so the logo's center is `border + padding + logo / 2`. `28px` undershoots that.

### Defect 2 — the also-with row

`.also` is the dashed box: a flex row (`gap: 14px 28px`) holding the label and the list
of company names.

```astro
<ul class="also-list">
  {alsoWithCompanies.map((name) => <li>{name}</li>)}
</ul>
```

`.also-list` has no rule at all. Tailwind's preflight zeroes its `list-style`,
`margin`, and `padding`, but `display` falls back to the UA default for `<ul>`:
`block`. Every `<li>` is a full-width block, so the four names stack into a column
instead of sitting in a row like `handoff/DESIGN_SPEC.md` §5 describes.

## Measured (before, `bun run build` + `astro preview`, Chromium, 1512×950, dark, `/`)

Same on all five jobs:

| | Offset from card top |
| --- | --- |
| Dot center | 34px |
| Logo center | 49px |
| **Difference** | **15px** |

```
card border: 1px, card padding: 20px, logo: 56px
border + padding + logo / 2 = 1 + 20 + 28 = 49px  ← matches the measured logo center
```

`.also-list`: `display: block`, height **96px** for 4 items (4 stacked lines), instead
of one row.

## Scope

### 1. The dot — derive it, don't guess it again

Move the numbers `.dot`'s offset actually depends on into custom properties on `.job`,
the closest ancestor shared by `.rail` (which holds the dot) and `.card` (which holds
`.who`, `.logo`, and the padding and border around them):

```css
.job {
  --card-pad: 20px;
  --card-border: 1px;
  --logo-size: 56px;
}
```

`.card`'s `padding` and `border-width`, and `.logo`'s `width`/`height`, read from those
same variables instead of repeating the numbers. `.dot`'s `margin-top` is then a
`calc()` of them — the logo's center minus half the dot's own size — rather than an
independent constant:

```css
.dot {
  --dot-size: 12px;
  width: var(--dot-size);
  height: var(--dot-size);
  margin-top: calc(
    var(--card-border) + var(--card-pad) + var(--logo-size) / 2 - var(--dot-size) / 2
  );
}
```

Change `--logo-size` (issue 15's real logos) or `--card-pad`, and the dot's position
recomputes with it — there is only one place that says how tall the logo is. `.rail`'s
own layout (a flex column, `justify-content: center` for the horizontal axis) and
`.rail::before`'s rail line are untouched; the ring that hides the rail behind the dot
is still the same `box-shadow`.

This is a CSS-only fix: no JavaScript reads the rendered logo geometry, because nothing
here needs to — the box model already computes it once the numbers are tied together.

### 2. The also-list — lay it out like `.chips`

Same pattern already used two rules above it for the stack chips:

```css
.also-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 28px;
}
```

The gap matches `.also`'s own (`14px 28px`) rather than inventing a second value.
`flex-wrap` is what turns the current-viewport overflow risk into a second line: with no
explicit width, the list's automatic minimum size is its widest single `<li>`, so at a
narrow viewport it shrinks and wraps instead of pushing the row wider than the
viewport.

## Regression guard

Following spec 19's precedent (`e2e/layout.spec.ts`): the bug in both defects is
geometry that no existing test reads, because every current test reads source or the
built CSS, never the rendered box model. `e2e/experience.spec.ts` (new) adds:

- Dot/logo alignment, asserted from measured `getBoundingClientRect()`s on both — the
  dot's center compared to the logo's center, not to a hardcoded pixel number, so the
  assertion keeps holding once issue 15 changes the logo.
- `.also-list`'s layout at 1512px (one row) and at 390px (wraps, no item exceeds the
  viewport width) — the two widths spec 19 already uses.
- The scramble still observes each `[data-company]` once and the reduced-motion path
  still leaves the markup resolved, guarding the existing behavior against the CSS
  changes above.

`tests/experience.test.ts` (existing, Bun/source-only) gets one addition: the dot's
`margin-top` must reference `calc()` and the shared custom properties rather than a
literal pixel value, so a future edit cannot silently reintroduce a guessed constant.

## Acceptance criteria

- [ ] For every job, the dot's vertical center equals the logo's vertical center within
      1px, at 1512px and at 390px.
- [ ] That assertion is derived from the rendered geometry (`getBoundingClientRect()` on
      both elements), not from a hardcoded 48px.
- [ ] `.also-list` lays its items out on one line at 1512px, and its height is one row's
      worth.
- [ ] `.also-list` wraps instead of overflowing at 390px, and no item's box extends past
      the viewport width.
- [ ] The company-name scramble still fires once per name via the component's own
      `IntersectionObserver`, and with `prefers-reduced-motion: reduce` the names stay
      resolved from the markup.
- [ ] `bun test`, `bun run lint`, `bun run build`, and the Playwright suite all pass.

## Out of scope

The real company logos (issue 15) — `--logo-size` exists so that change is a
one-line edit here, not a rewrite. The `alsoWithCompanies` contents in `src/lib/ui.ts`
— unconfirmed by the owner, unchanged, layout only. The page-wide no-horizontal-scroll
guard another block is adding this round — this spec keeps `.also-list` from being the
section that breaks it, but does not add that guard itself.
