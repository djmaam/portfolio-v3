# 14 · Footer — spec

Issue: [PV3-19](https://linear.app/portfolio-djmaam-v3/issue/PV3-19) · Branch: `feat/14-footer`
Design: `handoff/DESIGN_SPEC.md` §3.9 · `handoff/MOTION_SPEC.md` §12

## Goal

Close the page. Small block, built in parallel with issue 08 — so it stays strictly
inside its own files.

## Context

`Base.astro` has an unused `footer` slot. This block fills it by rendering `<Footer>`
**directly inside `Base.astro`**, not by passing it from the pages.

Why: issue 08 is editing `src/pages/*.astro` at the same time. Base already knows `lang`,
so the footer needs nothing from the pages. `Nav` keeps its current slot wiring —
unifying the two is a cleanup for issue 16, not for this block.

Content: `footerSig` from `content.json`, `site.name` and `site.handle` from
`content.ts`.

## Scope

### 1. `src/components/Footer.astro`

Props: `lang: Lang`. Uses `container-page` and `section-divider`.

Three parts, mono, `--text-label-sm`, `--color-dim`:

- `© 2026 {site.name} · {site.handle}`
- The ✳ glyph with `animation: think 2.6s cubic-bezier(.6,.05,.3,1) infinite` and
  `text-shadow: 0 0 10px var(--color-accent)`, plus `footerSig`.
- The rotating ASCIImoji.

The year is `new Date().getFullYear()` evaluated at **build time**. That is correct here
and wrong for the console's clock: a year is stable for months and the site rebuilds on
every deploy, while `hh:mm:ss` would be visibly stale within a minute.

### 2. `src/lib/asciimoji.ts`

The 15 faces from `MOTION_SPEC` §12, in the mock's order, plus:

```ts
export function asciimojiAt(tick: number): string   // MOJI[tick % MOJI.length]
```

Its own module, not `math.ts` — issue 08 is editing `math.ts` concurrently and this has
nothing to do with motion math.

Rotation every 1000ms. `min-width: 9ch` on the element so the layout never shifts.
`aria-hidden` — it is decoration and reads as garbage to a screen reader.

Under `reduce`: one fixed face, no interval.

### 3. Do not touch

`src/pages/*.astro`, `math.ts`, `About.astro`, `Nav.astro`, `reveal.ts`. Issue 08 owns
those right now. If the footer seems to need something from them, stop and say so
instead of editing them.

## Acceptance criteria

- [ ] `bun test`: `asciimojiAt` cycles all 15 faces in order and wraps.
- [ ] `bun test`: the list matches `MOTION_SPEC` §12 exactly, in order, 15 entries.
- [ ] `bun test`: with `reduce`, no interval is started.
- [ ] The rendered year comes from the build date, not a literal.
- [ ] The ASCIImoji element is `aria-hidden` and its width does not change as faces rotate.
- [ ] The ✳ is `aria-hidden`.
- [ ] `footerSig`, name and handle all come from `content.ts`. No literal copy.
- [ ] With JavaScript disabled the footer renders complete with one face showing.
- [ ] Still exactly one scroll listener call site; the footer adds none.
- [ ] `git status` shows changes only in `Base.astro`, `Footer.astro`, `asciimoji.ts`, `app.css` and the new test file.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.

## Out of scope

Every section above the footer. The `/world` route mentioned in `ARCHITECTURE.md` — it
does not exist and is not linked.
