# 22 · Stack: the row that drags the document — spec

Issue: [PV3-27](https://linear.app/portfolio-djmaam-v3/issue/PV3-27) · Branch: `feat/22-stack`
Design: `handoff/DESIGN_SPEC.md` §3.7 · `handoff/MOTION_SPEC.md` §10 · `handoff/reference/Portfolio.dc.html`

> [!NOTE]
> Refines the initial stack marquee component from [12 · Stack](./12-stack.md).

## Goal

Two things, one file. First: the stack makes the **whole document** 3540px wide inside a
1512px viewport. Second: three rows of 17-18 chips are ~1.3× the content column each, so
most of the stack is off screen most of the time — redistribute the same names into rows
that each fit the column.

## Context — why the page scrolls sideways

`.stack` is a grid, and its single implicit column is sized `auto`, which resolves to the
**max-content** of the widest item. The widest item is `.rows`, because under
`prefers-reduced-motion: no-preference` every `.track` is `width: max-content;
flex-wrap: nowrap` — 3100px of chips on a 1200px column.

`.row { overflow: hidden }` looks like it should contain that, and it does contain the
*automatic minimum size* (`overflow` other than `visible` zeroes it). It does nothing to
the **max-content contribution**, which is what an `auto` grid track is measured against.
So the track resolves to 3384px, the grid item gets 3384px, `.container-page` overflows,
and the document with it.

Three visible consequences, all of them the same bug:

1. **The subtitle is off screen.** `header` is a sibling item in the same blown track, so
   its `auto-fit` two-column grid is laid out on 3384px and `stackSub` starts at x=1864 —
   past the right edge of a 1512px viewport.
2. **The right-hand fade never shows.** The `mask-image` stops at 8% / 92% are symmetric
   and correct; 92% of a 3384px row is simply off screen. The mask is fine, the width is
   not.
3. **The rows are not clipped by anything the user can see.** Every row is as wide as the
   widest row, so the marquee runs against a box nobody's viewport contains.

Measured in Chromium at 1512×950, `/` and `/en` identical:

| | Mock | Ours | Ours with `minmax(0, 1fr)` |
| --- | --- | --- | --- |
| `documentElement.scrollWidth` | 1512 | 3540 | **1512** |
| `.stack` grid item width | — | 3384 | **1200** |
| `stackSub` x | — | 1864 | **772** |
| `.row` width | — | 3384 | **1200** |

The mock (`handoff/reference/Portfolio.dc.html`, opened standalone) measures 1512 with no
overflow at all, so this is ours, not the design's.

`grid-template-columns: minmax(0, 1fr)` is the fix rather than the first number that
moved: `1fr` is `minmax(auto, 1fr)`, and it is the `auto` *minimum* that lets a track grow
past its share — `minmax(0, 1fr)` says the column is the container's width and may be
narrower than its content, which is the definition of what a clipped marquee needs. It is
one declaration on the container that owns the overflow, and it fixes the header, the mask
and the clip at once, because all three are the same 3384px.

## Context — three rows is too few for 52 chips

`stack.rows` holds 52 technologies as 17 / 17 / 18. One `.half` of each row measures
1550 / 1485 / 1692px against a 1200px content column, so each row is ~1.3 columns wide and
any given technology is off screen for most of its 70-85s loop.

### Deviation from the handoff — recorded, not silent

`DESIGN_SPEC` §3.7 and `MOTION_SPEC` §10 both specify **three** rows at 70s / 85s
(reverse) / 78s. This block ships **four**, at the request of the site's owner. `handoff/`
is not edited; the deviation lives here.

Justification, from the measured chip widths (12px mono: a chip is 34px of padding,
border and gap plus 7.2px per character; the 52 chips total 4728px):

| Rows | `.half` widths | vs. the 1200px column |
| --- | --- | --- |
| 3 (handoff) | 1550 · 1485 · 1692 | 1.24-1.41× — a row never fits |
| **4** | **1182 · 1207 · 1193 · 1146** | **0.96-1.01× — a row is the column** |
| 5 | 941 · 966 · 892 · 976 · 952 | 0.74-0.81× — a half is narrower than the column |

Four wins on both edges. At four, one half is the visible column to within 5%, so the
viewport window onto the marquee holds very nearly one complete pass of that row's
technologies — which is the whole point of the change. At five the half is *smaller* than
the column, so both halves are on screen at once and the viewer sees the same chip twice
side by side, which reads as a rendering bug rather than as a marquee. Five also adds a
fifth row of vertical weight to a section the design draws as three.

Speeds stay in the handoff's 70-85s family and the direction keeps alternating:
70s / 85s reverse / 78s / 82s reverse.

## Scope

`src/components/Stack.astro`, `src/lib/stack.ts` (new), `tests/stack.test.ts`,
`tests/stackRows.test.ts` (new), `e2e/layout.spec.ts`, this spec. Nothing else — four
sibling agents are in Nav, Experience, Projects and Hero right now.

### 1. `.stack { grid-template-columns: minmax(0, 1fr) }`

The overflow fix. One declaration.

### 2. `src/lib/stack.ts` — the regrouping

`content.json` is read-only, so the four rows are computed at build time from the same
`stack.rows`, never re-typed:

```ts
export function groupRows(names: string[], count: number): string[][]
```

Each name in turn joins the row that is narrowest so far, using `chipWidth(name) =
34 + 7.2 × name.length` — the measured geometry of a 12px mono chip, exact for a
monospace face and the reason this is a pure function and not a DOM measurement. Every
name lands in exactly one row, and the component keeps reading the highlight from the
single `stack.core` list.

It is a `src/lib/` module and not a constant in the component because a greedy balance is
logic with an edge (a long name arriving last), and this repo tests logic without a DOM.

### 3. The regression guard

`e2e/layout.spec.ts` gets the assertion this bug should have failed on for two blocks:
`document.documentElement.scrollWidth === clientWidth`, on `/` and `/en`, at 1512, 1024
and 390. It sits with the other page-geometry assertions because it is not about the
stack — it is about any future section doing what the stack did.

The same file asserts the marquee's own invariant: each `.track` is **exactly** 2× its
first `.half`, which is what makes `translateX(-50%)` land on the clone boundary. (The
existing comment in the component — the gap lives on the chip, not on the flex container,
or the track would be `2 × half + gap` — is why that identity holds; it still applies.)

## Acceptance criteria

- [ ] `document.documentElement.scrollWidth === clientWidth` on `/` and `/en` at 1512,
      1024 and 390 — in `e2e/layout.spec.ts`. **Holds at 1512 and 1024; at 390 it is a
      `test.fail` for a defect this block does not own** (see below), and no `section` or
      `container-page` child overflows at any of the three.
- [ ] The stack subtitle is inside the viewport, in the header's second column.
- [ ] Every `.track` measures exactly 2× its `.half`, at every one of those widths.
- [ ] Both edges of a row fade, and no row is wider than its container.
- [ ] Four rows; every technology in `stack.rows` appears exactly once per half — none
      dropped, none duplicated — asserted against the flattened source list.
- [ ] `bun test`: the highlight still comes only from `stack.core`, and no technology name
      is written in the component.
- [ ] Speeds 70 / 85 / 78 / 82s with rows 2 and 4 reversed, all four inside the
      `no-preference` block; `tests/a11y.test.ts` still finds no unguarded animation.
- [ ] With `reduce` the rows are static, wrapped and complete from the first frame.
- [ ] `bun test`, `bun run lint`, `bun run build` and the Playwright suite pass.

## Found on the way: the footer at 390px

With the stack's 3540px gone, one horizontal overflow is left on the site and it is not
this section's. `Footer.astro` stacks the fifteen ASCIImoji faces in a single inline-grid
cell (`.moji`, `min-width: 9ch`) to size the box to the widest face; at a 390px viewport
that cell is squeezed to 84px while its widest hidden face still measures ~111px, and the
faces overflow it. The document measures 397 in ES and 391 in EN — 7px and 1px — while
every section fits inside 390.

It is pre-existing, it was invisible while the stack was contributing 3404px of its own,
and `Footer.astro` is outside this block's files. It is recorded here and left as a
`test.fail` in `e2e/layout.spec.ts` so it is visible in every CI run and turns red — not
silently green — the day the footer is fixed. A one-line fix belongs to whoever owns the
footer next: the `.moji` cell needs `overflow: hidden` or the ghosts need to not exceed it.

## Out of scope

Row count as a content decision — `stack.rows` keeps its 3×N shape in `content.json` and
the component regroups it; changing the handoff is not this block's call. The reveal, the
legend, the chip design and the `core` highlighting are unchanged. Lighthouse is CI's, not
this machine's — five agents share it.
