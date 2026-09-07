# 11 · Projects — spec

Issue: [PV3-16](https://linear.app/portfolio-djmaam-v3/issue/PV3-16) · Branch: `feat/11-projects`
Design: `handoff/DESIGN_SPEC.md` §3.6 · `handoff/MOTION_SPEC.md` §9 · design doc §8

> [!NOTE]
> Refined in [24 · Projects](./24-projects.md) (shimmer loop and link fixes).

## Goal

Six project cards, each with a live preview or a screenshot, and a shimmer over it.

## Context

**Three other sections are being built in parallel.** You own `Projects.astro` and the
`projects` markers in both pages. Nothing else.

Reuse `bindReveals` from `reveal.ts`.

Content: `secProjects`, `projectsTitle`, `projectsSub`, `projects`
(6 × `{name, kind, host, url, desc}`).

## Scope

`src/components/Projects.astro`, props `lang: Lang`, section `id="projects"`.

Header: `04 / PROYECTOS` + `projectsTitle` + `projectsSub`.
Grid `repeat(auto-fit, minmax(min(100%, 300px), 1fr))`.

Card: a 16:11 preview, the `kind` label top-left over it, and a bottom row with `name`,
`desc` and `↗`. No stack chips.

### Preview mode, decided per project

Header checks run 2026-09-05:

| host | preview |
|---|---|
| nera-agro.com | iframe |
| agropro.ag | iframe |
| kodaiverse.com | iframe |
| masushuaia.com | iframe |
| creativamedialab.com | screenshot — `X-Frame-Options: DENY` |
| telecentro.com.ar | screenshot — WAF, no response |

Declare the mode in a constant keyed by `host`, **not** by array index — reordering
`content.json` must not silently swap an iframe onto a site that blocks it. A unit test
asserts every project in `content.json` has a mode.

iframe: `loading="lazy"`, `sandbox`, `pointer-events: none`, `aria-hidden`, `tabindex="-1"`,
scaled with `transform: scale(.25)` inside the 16:11 box.

Screenshot: `public/previews/<host>.png`. **Those files do not exist yet** and are pending
from the user. Render a striped placeholder of the same aspect ratio when the file is
absent — do not generate images, do not screenshot the sites yourself.

Shimmer over every preview: `skewX(-12deg)`, 40% wide, accent gradient at .12,
`shimmer 2.8s ease-in-out infinite`.

Reveal staggered `90·(i % 3)`. Hover `translateY(-4px)` + accent border + shadow — on the
card, with `data-reveal` on the wrapper.

## Acceptance criteria

- [ ] `bun test`: every project in `content.json` has a declared preview mode, keyed by host.
- [ ] `bun test`: the two blocked hosts are `screenshot`; the other four are `iframe`.
- [ ] `bun test`: `revealDelay` staggers `90·(i % 3)`.
- [ ] No iframe loads before entering the viewport (`loading="lazy"` on all four).
- [ ] The two screenshot projects mount no iframe at all.
- [ ] Every iframe is `aria-hidden`, `tabindex="-1"` and `pointer-events: none` — it must not be a tab stop.
- [ ] With `reduce`: no shimmer, no reveal.
- [ ] Still exactly one scroll listener call site.
- [ ] `git status` touches only `Projects.astro`, the two page markers, its styles and its test file.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.
