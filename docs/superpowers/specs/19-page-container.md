# 19 · Page container: content-box — spec

Issue: [PV3-24](https://linear.app/portfolio-djmaam-v3/issue/PV3-24) · Branch: `feat/19-page-container`
Design: `handoff/DESIGN_SPEC.md` §2 · `handoff/reference/Portfolio.dc.html`

## Goal

Make the page grid 1200px wide, as the design says it is. Today it is 1104px, and that
one number is what makes the hero H1 wrap to five lines instead of four and the console
render 48px too narrow.

## Context

`DESIGN_SPEC` §2 says: `max-width: 1200px; padding: 0 clamp(20px, 4vw, 48px)`. Our
`container-page` implements it literally:

```css
@utility container-page {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: clamp(20px, 4vw, 48px);
}
```

But Tailwind's reset sets `box-sizing: border-box`, so the 1200px cap **includes** the
padding. The mock does the opposite — measured on `handoff/reference/Portfolio.dc.html`
in Chromium at 1512×950:

```
MAIN   max-width: 1200px   padding: 48px   box-sizing: content-box
       border box 1296 wide, content box 1200 wide, starting at x=156
```

So the spec line is ambiguous and we read it the wrong way. Every section of the site is
96px narrower and 48px further inward than the design intends.

`box-sizing` only affects an explicit `width`/`max-width`, so this changes nothing below
a 1296px viewport: with `width: auto` the content box is still the parent minus the
padding, exactly as today. The whole change lands above 1296px.

## Measured

At 1512×950, Chromium, dark:

|  | Mock | Ours | Ours with `content-box` |
| --- | --- | --- | --- |
| Content column | 1200 | 1104 | **1200** |
| Content starts at x | 156 | 204 | **156** |
| Hero column | 564 | 516 | **564** |
| H1 width | 564 | 516 | **564** |
| H1 height | 296 (4 lines) | 380 (5 lines) | **304 (4 lines)** |
| Console width | ~562 | 509 | **564** |

The "ours with content-box" column was produced by injecting the single declaration into
the live page and re-measuring. Nothing else changed.

## Scope

### 1. The change

Add `box-sizing: content-box` to the `container-page` utility. That is the whole fix.

### 2. What has to be re-checked, not assumed

Nine call sites consume `container-page`. Widening the content box by 96px can change how
their `auto-fit` grids resolve, and two of them have code that depends on the answer:

- **Projects** — `repeat(auto-fit, minmax(min(100%, 300px), 1fr))` with `gap: 14px`.
  Four columns need `4×300 + 3×14 = 1242px`, so 1200px still resolves to three. It clears
  by 42px, which is close enough that `projectDelay(i) = 90 * (i % 3)` in
  `src/lib/projects.ts` — which hardcodes three columns — would silently stagger the wrong
  cards if it ever tipped. Assert the column count, so it cannot tip unnoticed.
- **Method** — the pin decision is `inner.offsetHeight + 64 <= vh` at runtime. A wider
  container makes the five steps shorter, so the section pins at viewport heights where it
  used to stay in flow. Confirm it still both pins and unpins, and that the 0 → 4 advance
  still works.
- **Contact, About, Experience, Stack, Hero, Footer** — visual only; no code reads their
  width.

### 3. The regression guard

The reason this survived sixteen blocks is that nothing measures page geometry: every
existing test reads source or the built CSS. Add `e2e/layout.spec.ts` with the geometry
assertions below — a small file that owns "the page grid is the right size and in the
right place", so the next section to get this wrong fails in CI.

Keep it to layout invariants. It is not a visual regression suite.

## Acceptance criteria

- [ ] At a 1512px viewport, on `/` and `/en`, the content box of `container-page` measures
      1200px and starts at x=156 — asserted against the mock's numbers, not ours.
- [ ] At 1280px and 390px the container still measures viewport minus twice the resolved
      padding, so nothing regresses below the cap.
- [ ] The hero H1 renders in **four** lines at 1512px. Asserted by measuring its height
      against its `line-height`, not by counting words.
- [ ] The projects grid resolves to exactly three columns at 1512px, so `projectDelay`
      keeps matching the layout.
- [ ] The method section still pins and still advances 0 → 4 (the existing Playwright test
      covers the advance; confirm the pin decision at the new width).
- [ ] `bun run build`, `bun test`, `bun run lint` and the Playwright suite all pass.
- [ ] Lighthouse stays ≥ 0.90 on all four categories on both routes.

## Out of scope

Aligning the nav to this container — that is issue 20, and it depends on this landing
first. Re-measuring the hero's height, node cloud and console against the mock — issue 27,
same dependency. The stack's horizontal overflow is issue 22 and is a separate root cause;
it is not fixed or worked around here.
