# 10 · Experience — spec

Issue: [PV3-15](https://linear.app/portfolio-djmaam-v3/issue/PV3-15) · Branch: `feat/10-experience`
Design: `handoff/DESIGN_SPEC.md` §3.5 · `handoff/MOTION_SPEC.md` §8

## Goal

The vertical timeline of five roles, with the company name scrambling as each item
enters the viewport.

## Context

**Three other sections are being built in parallel.** You own `Experience.astro` and the
`experience` markers in both pages. Everything else in `src/pages/*.astro`,
`Projects.astro`, `Stack.astro`, `Contact.astro`, `math.ts` and `app.css`'s shared rules
belongs to someone else. If you think you need one of them, stop and say so.

Reuse, do not reimplement: `bindReveals` (`reveal.ts`), `scramble` (`scramble.ts`).

Content: `secWork`, `workTitle`, `jobs` (5 × `{abbr, company, period, role, note, stack[], dot, glow}`),
`alsoWith`.

## Scope

`src/components/Experience.astro`, props `lang: Lang`, section `id="work"`.

Header: mono label `03 / EXPERIENCIA` + `workTitle`.

Timeline: a 1px rail down the left with a dot per item. Grid
`repeat(auto-fit, minmax(min(100%, 260px), 1fr))`.

Per job:
- Logo placeholder: 56px, `border-radius: 16px`, striped background, the `abbr` centered.
  **The real logos are issue 15 and undecided** — do not invent an asset or a source.
- `company` (scrambles on entry, 1000ms, via the shared `scramble`) + `period` in mono dim.
- `role` in accent.
- `note` in body dim.
- `stack[]` as chips: mono 11px, `border-radius: 8px`, 1px border.

**The `dot` and `glow` fields hold literal colors** (`#3EE7FF`, `rgba(62,231,255,.6)`).
`check-tokens` only scans source files, so passing them through from JSON does not trip
it — but hardcoding a theme color defeats the token system, and those values are the
*dark* accent, wrong in light mode. Use them only as a flag: an item whose `glow` is set
is the current role and gets `--color-accent` plus the accent glow; every other dot uses
`--color-line`. Do not emit the raw values.

Below the timeline: a `border: 1px dashed` box labeled `alsoWith`, holding the remaining
company names. Those names are **not in `content.json`** — `alsoWith` is only the label.
Render the box with the label and leave the list empty rather than inventing names, and
flag it in your report.

Reveal per item; `data-reveal` on a wrapper, never on the element with the hover
`transform`. Hover: `translateY(-4px)`, accent border, shadow.

## Acceptance criteria

- [ ] `bun test`: the 5 jobs render from `content.json` in both languages; no literal copy.
- [ ] `bun test`: exactly one job carries `glow`, and only that one is marked current.
- [ ] No raw color from `dot`/`glow` appears in the built HTML or CSS.
- [ ] The company scramble imports the shared `scramble` — no second implementation.
- [ ] With `reduce`: names resolved, no reveal, no scramble.
- [ ] With JavaScript disabled the whole timeline is legible.
- [ ] Still exactly one scroll listener call site.
- [ ] `git status` touches only `Experience.astro`, the two page markers, its own styles and its test file.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.
