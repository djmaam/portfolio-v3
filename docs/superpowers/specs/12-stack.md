# 12 · Stack — spec

Issue: [PV3-17](https://linear.app/portfolio-djmaam-v3/issue/PV3-17) · Branch: `feat/12-stack`
Design: `handoff/DESIGN_SPEC.md` §3.7 · `handoff/MOTION_SPEC.md` §10 · `handoff/README.md` rule 4

## Goal

Three marquee rows of technology chips. **Zero percentage bars** — that is a
non-negotiable rule of the handoff.

## Context

**Three other sections are being built in parallel.** You own `Stack.astro` and the
`stack` markers in both pages. Nothing else.

Reuse `bindReveals` from `reveal.ts`.

Content: `secStack`, `stackTitle`, `stackSub`, `stackCore`, `stackAlso`, and top-level
`stack` = `{ core: string[21], rows: string[3][] }`. `core` lists the names to highlight;
`rows` holds the three marquee rows (17, 17, 18 items).

## Scope

`src/components/Stack.astro`, props `lang: Lang`, section `id="stack"`.

Header grid `repeat(auto-fit, minmax(min(100%, 300px), 1fr))`: `05 / STACK` +
`stackTitle` + `stackSub`.

Three rows, each `width: max-content` with its content **duplicated** so
`@keyframes marquee { to { transform: translateX(-50%) } }` loops seamlessly. Durations
70s / 85s / 78s, the middle one reversed, `linear infinite`.
`animation-play-state: paused` on hover — only the hovered row.
`mask-image` fading 8% at both edges.

Chips: mono, `border-radius: 8px`. A chip whose name is in `stack.core` renders in accent
with an accent-tinted border; the rest are dim with a `--color-line` border.
Membership is computed from the `core` array — never a second hardcoded list.

Legend below: `● {stackCore} / ○ {stackAlso}`.

Reveal per row.

The duplicated half must be `aria-hidden` so a screen reader reads each technology once.

## Acceptance criteria

- [ ] `bun test`: every name in `stack.core` appears in some row of `stack.rows` — a highlight that matches nothing would be a silent typo.
- [ ] `bun test`: chip highlighting is derived from `stack.core`, with no second list in the component.
- [ ] The rendered rows contain each row's items exactly twice, and the second copy is `aria-hidden`.
- [ ] No element resembling a progress bar or a percentage exists in the section.
- [ ] Hover pauses only the row under the cursor.
- [ ] With `reduce`: rows static and fully legible from the first frame.
- [ ] Still exactly one scroll listener call site.
- [ ] `git status` touches only `Stack.astro`, the two page markers, its styles and its test file.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.
