# portfolio-v3 — Technical design

Date: 2026-09-05 · Design source of truth: `handoff/`

## 1. Goal and scope

Build `marcosarrieta.dev`: a bilingual static site (ES/EN), light/dark theme, with the
design and animations defined in `handoff/DESIGN_SPEC.md` and
`handoff/MOTION_SPEC.md`, and all the copy coming from `handoff/content.json`.

**Inside v1:** the nine sections (nav, hero, decorative console, node network, about,
method, experience, projects, stack, contact, footer), full motion, i18n, theme,
accessibility, tests, deploy to Cloudflare Pages.

**Outside v1:** the interactive agent console from `AGENT_CONSOLE_SPEC.md` (Worker +
Anthropic API). It gets specced and built as v1.1 with its own cycle.
The 3D game mode (`/world`) is not in scope and does not reserve a route yet.

## 2. Stack

| Piece | Decision |
|---|---|
| Framework | Astro 7, static output (`output: 'static'`) |
| Runtime / PM / tests | Bun (`bun test`) |
| Language | TypeScript strict |
| Styles | Tailwind v4 via `@tailwindcss/vite`, tokens in `@theme` |
| Motion | Vanilla TS (IntersectionObserver + rAF). No Framer, no GSAP |
| Fonts | **Manrope** variable (sans, `wght 200..800`) + **IBM Plex Mono** static 400/500 (mono) — IBM Plex Mono has no variable version. Self-hosted woff2 in `public/fonts`, `font-display: swap` |
| E2E | Playwright (smoke) |
| Deploy | Cloudflare Pages, static build |

**Correction to the handoff:** `handoff/reference/Portfolio.dc.html` is not vanilla JS —
it is a component of the `dc` runtime (a class with `setState` and refs, inline styles).
Portable: the *maths* (canvas projection, scramble, scroll progress, step computation,
per-word opacity). Not portable: the state/refs plumbing and the entire CSS, which gets
rewritten in Tailwind from `DESIGN_SPEC.md`.

**Correction to the handoff:** the font decision was Geist vs Manrope; it lands on
**Manrope**, with `-apple-system, "Helvetica Neue", sans-serif` as fallback. The mono is
IBM Plex Mono in static weights 400 and 500: there is no variable version.

**Correction to the handoff:** `ARCHITECTURE.md` says Astro 5, which was the current
version when it was written. The project settled on **Astro 7**, the latest. Nothing
that is planned depends on version 5 APIs.

**No UI framework in v1.** Neither React nor any other one comes in. The sections are
static HTML fed by `content.json` (zero UI state) and the motion is imperative over the
DOM (rAF, canvas, IntersectionObserver), where a framework only adds a layer that then
gets bypassed with refs. The cost would be ~45 KB of JS against a budget of Lighthouse
≥ 90 mobile with the canvas running.

The only candidate: the v1.1 agent console, which does have state (history, streaming,
expand/collapse). It comes in as a **single island** (`bunx astro add react` +
a `.tsx` with `client:visible`) without touching anything built in v1. Decision
deferred to that stage.

## 3. Structure

```
src/
  styles/app.css          # @import tailwindcss; @theme tokens; keyframes; loose utilities
  lib/
    content.ts            # typed import of handoff/content.json
    i18n.ts               # Lang, sibling routes, detection/persistence
    motion/
      network.ts          # node canvas (class + pure projection functions)
      scramble.ts
      reveal.ts           # IntersectionObserver + [data-reveal] + [data-delay]
      scroll.ts           # single rAF listener: aurora + about + method
      boot.ts             # hero sequence
      consoleLog.ts       # decorative log cycle + metrics
      math.ts             # shared pure functions (tested without DOM)
  layouts/Base.astro
  components/
    Nav.astro Hero.astro Console.astro About.astro Method.astro
    Experience.astro Projects.astro Stack.astro Contact.astro Footer.astro
  pages/index.astro       # es
  pages/en/index.astro
public/fonts/ public/logos/ public/previews/ public/og.png public/favicon.svg
tests/                    # bun test
e2e/                      # Playwright
docs/superpowers/specs/   # this doc + one spec per issue
```

## 4. Tokens and theme

The tokens from `DESIGN_SPEC.md §2` live in Tailwind's `@theme` as CSS variables with
`light-dark(light, dark)`. `:root` carries `color-scheme`.

```css
@theme {
  --color-bg:      light-dark(#F4F5F7, #08090C);
  --color-ink:     light-dark(#0B0D12, #F3F5F9);
  --color-dim:     light-dark(#5E6675, #8B94A7);
  --color-accent:  light-dark(#0A8FAF, #3EE7FF);
  /* … line, surface, glass, accent-soft, violet, console-bg, contact-card */
}
```

Rule: **no literal colour in a component**. Only `text-ink`, `bg-bg`,
`border-line`, etc. A lint test (grep in CI) fails if a hex shows up outside
`app.css`.

Theme: inline script in the `<head>` of `Base.astro`, before any CSS, that reads
`localStorage.theme` or `prefers-color-scheme` and sets `color-scheme` on `<html>`.
The toggle writes `localStorage` and updates the attribute. No flash.

Typographic scale: `clamp()` equivalent to the mock's `cqw` (`DESIGN_SPEC.md §2`),
declared as `--text-*` in `@theme`.

## 5. Content and i18n

`handoff/content.json` remains the single source. `src/lib/content.ts` imports it and
exports derived types:

```ts
import raw from '../../handoff/content.json'
export type Lang = 'es' | 'en'
export type Content = (typeof raw)['i18n']['es']
export const content: Record<Lang, Content> = raw.i18n
export const { links, stack, consoleLog } = raw
```

Routes: `/` (es) and `/en` (en). Each page passes `t = content[lang]` to the components.
Language toggle = a real `<a>` to the sibling route + `localStorage.lang`; on the first
load, if `localStorage.lang` does not match the route, it redirects a single time.
`<link rel="alternate" hreflang>` on both.

Tested invariant: the keys of `es` and `en` are identical, and `jobs`, `projects`,
`steps`, `principles`, `stepVerbs` have the same length in both languages.

## 6. Motion

All the motion lives behind `@media (prefers-reduced-motion: no-preference)` and a
guard in JS (`matchMedia('(prefers-reduced-motion: reduce)')`). With `reduce`: the
content is visible from the first frame and the canvas does not mount.

Progressive enhancement: the initial `opacity:0` states apply only under
`html.has-js` (a class set by the inline script in the head). Without JS, the site
reads in full.

A single rAF-throttled scroll listener (`scroll.ts`) feeds the aurora, the "Sobre mí"
words and the "Cómo trabajo" sticky.

**Motion testing strategy:** all the maths moves out into pure functions in
`motion/math.ts`, testable with `bun test` without a DOM:

- `stepFromProgress(p) → { active, done }` (`MOTION_SPEC §7`)
- `wordOpacity(i, n, p) → number` (`§6`)
- `collapseFactor(scrollY, vh) → 0..1` (`§3`)
- `scrambleFrame(target, p) → string` (`§1`)
- `projectNode(node, cam) → { x, y, sc, alpha }` (`§3`)
- `bootDelay(n) → ms` (`§2`)

Whatever touches the DOM (observers, canvas, listeners) is covered by the Playwright
smoke.

## 7. Accessibility

- Visible focus on everything interactive: `2px` accent ring, 2px offset (not in the
  mock; it gets added).
- Toggles with `aria-label` and `aria-pressed`. Decorative icons `aria-hidden`.
- Hero canvas `aria-hidden` + `pointer-events: none`.
- `dim` on `bg` contrast ≥ 4.5:1 in both themes, verified in the a11y issue.
- Cyan as a text colour only at ≥ 15px or weight 500.

## 8. Projects: previews

Header check done on 2026-09-05:

| Site | Result | Preview |
|---|---|---|
| nera-agro.com | no restriction | iframe |
| agropro.ag | no restriction | iframe |
| kodaiverse.com | no restriction | iframe |
| masushuaia.com | no restriction | iframe |
| creativamedialab.com | `X-Frame-Options: DENY` + `frame-ancestors 'none'` | screenshot in `public/previews` |
| telecentro.com.ar | does not respond to `curl` (WAF) | screenshot in `public/previews` |

iframe: `loading="lazy"`, `sandbox`, `pointer-events:none`, `aria-hidden`,
`transform: scale(.25)` inside a 16:11 container. Declarative per-project fallback in a
component field, not by runtime detection.

## 9. Quality and CI

- `bun test` — content (es/en parity) and `motion/math.ts`.
- `bun run lint` — ESLint + Prettier + the anti-hex grep.
- `bun run build` — static Astro.
- Playwright smoke: hero boot visible, theme toggle, language toggle navigates to
  `/en`, a reveal fires on scroll, the method sticky advances a step.
- Lighthouse CI ≥ 90 on the four metrics, mobile. If Performance falls short,
  degrade in this order: shimmer → aurora → nodes.
- GitHub Actions runs lint + test + build on every PR.

## 10. Workflow (SDD + TDD)

One Linear issue = one block = one PR. Per issue:

1. The spec is written in `docs/superpowers/specs/NN-<block>.md` with verifiable
   acceptance criteria. The spec is committed before coding.
2. Branch `feat/NN-<block>`.
3. A subagent implements with tests first (the acceptance criteria are the tests).
   Subagent choice by task type:
   - `feature-dev:code-architect` when the spec needs design up front
   - `general-purpose` for implementation
   - `feature-dev:code-reviewer` before the merge
4. Review, merge into `main`, issue to Done.

Only blocks that do not touch the same files get parallelised (Experience + Projects
do; anything against Base or tokens, no).

## 11. Backlog

| # | Block | Depends on |
|---|---|---|
| 00 | Scaffold: Bun + Astro + TS strict + Tailwind v4 + ESLint/Prettier + CI | — |
| 01 | Tokens, typographic scale, light/dark theme without flash, Manrope + IBM Plex Mono fonts | 00 |
| 02 | `content.ts` + i18n + `/` and `/en` routes + toggle | 00 |
| 03 | `Base.astro`: head, font preload, aurora, container, separators | 01, 02 |
| 04 | Nav: glass, links, brand scramble, ✳, toggles | 03 |
| 05 | Hero: markup, H1, CTAs, stats, boot sequence | 03 |
| 06 | Decorative console: cyclic log, metrics, scanlines, sweep | 05 |
| 07 | Node network canvas: ellipsoid, connections, ✳ formation, commands, cursor, collapse | 06 |
| 08 | Sobre mí: lead with words that light up, paragraph, 3 principles | 03 |
| 09 | Cómo trabajo: 5-step sticky, traffic light, status indicator | 03 |
| 10 | Experience: timeline, dots, chips, company scramble, "también con" box | 03 |
| 11 | Projects: grid, previews (iframe/screenshot), shimmer, hover | 03 |
| 12 | Stack: 3 marquees, pause on hover, masks, legend | 03 |
| 13 | Contact: inverted card, spinning conic border, grid, email, pills | 03 |
| 14 | Footer: signature, ✳, rotating ASCIImoji | 03 |
| 15 | Company logos (placeholder → real assets) — *to be planned, undefined* | 10 |
| 16 | A11y: focus rings, contrast, aria, reduced-motion audit | 04–14 |
| 17 | Playwright smoke + Lighthouse CI | 16 |
| 18 | Deploy to Cloudflare Pages + domain + Email Routing | 17 |

## 12. Pending from the user (not blocking)

- Start date at Nera (today "abr. 2023 — hoy").
- Definitive role and stack for Creativa Media Lab and Kodai (the mock's are guesses).
- Company logos (issue 15) and screenshots of the two previews that do not accept
  iframe.
- Renew `marcosarrieta.ar` and 301-redirect it to the `.dev` one if it had traffic.
