# 03 · Base.astro, aurora, single scroll listener — spec

Issue: [PV3-8](https://linear.app/portfolio-djmaam-v3/issue/PV3-8) · Branch: `feat/03-base-layout`
Design: `docs/superpowers/specs/2026-09-05-portfolio-v3-design.md` §3, §6 · `handoff/DESIGN_SPEC.md` §2 (spacing), §3 · `handoff/MOTION_SPEC.md` §4

## Goal

The layout every page mounts into, and the scroll engine every later motion issue hooks
onto. After this block, adding a section means writing a component — never touching the
head, the container, or the scroll wiring.

## Context

`src/pages/index.astro` and `src/pages/en/index.astro` currently duplicate, verbatim:
the whole `<head>`, the inline theme + language script, the two font preloads, the three
`hreflang` alternates, and the language toggle anchor. Issue 02 left it that way on
purpose. All of it moves here, and the pages shrink to `lang` + content.

`src/lib/content.ts` exports `content`, `links`, `stack`, `consoleLog`, `site`.
`src/lib/i18n.ts` exports `langFromPath`, `siblingPath`, `DEFAULT_LANG`.

## Scope

### 1. `src/layouts/Base.astro`

Props: `lang: Lang`. Everything else derives from it (`t`, `otherLang`, `siblingHref`).

Owns:

- The full `<head>`: charset, viewport, favicon, `<title>` (`${site.name} · ${t.eyebrow}`),
  `<meta name="description">` (`t.heroSub`), the three `hreflang` alternates,
  `<link rel="canonical">`.
- Open Graph and Twitter card tags: `og:title`, `og:description`, `og:url`, `og:type`,
  `og:locale` (`es_AR` / `en_US`), `og:image` → `${links.domain}/og.png`,
  `twitter:card` = `summary_large_image`. **`public/og.png` does not exist yet** — that
  is fine, the tags ship and the file arrives with the deploy issue. Do not invent one.
- The two font preloads.
- The inline theme + language script, moved verbatim from the pages. It stays
  `is:inline` and keeps receiving `otherLang` / `siblingHref` through `define:vars`.
- `<html lang={lang}>`, `<body>`, the aurora, and slots.

Slots: a default `<slot />` for the page content, plus named `nav` and `footer` slots.
Issues 04 and 14 fill those; until then a page that provides neither renders fine.

### 2. Layout utilities

In `src/styles/app.css`, using Tailwind v4's `@utility`, so components stop repeating
the magic numbers:

- `container-page` — `max-width: 1200px; margin-inline: auto; padding-inline: clamp(20px, 4vw, 48px)`
- `section-y` — `padding-block: clamp(56px, 7vw, 100px)`
- `section-divider` — `border-top: 1px solid var(--color-line)`

Hero padding (`clamp(72px,10vw,140px)` top / `clamp(64px,8vw,110px)` bottom) is not a
utility: it appears once, in issue 05.

### 3. Aurora

Three blobs: `position: fixed`, `border-radius: 50%`, `filter: blur(90–100px)`,
`z-index: 0`, colors accent@.16–.22 and violet@.14, sitting behind `<main>`.
Animations `aur1` 16s / `aur2` 20s / `aur1` 24s, all `alternate` — the keyframes already
exist in `app.css` from issue 01.

`aria-hidden`, `pointer-events: none`. On viewports under 720px, only two blobs render
(`MOTION_SPEC` §13).

The aurora is the only thing painted at `z-index: 0`; page content sits above it.

### 4. `src/lib/motion/scroll.ts` — the single listener

The **only** `scroll` listener in the site. rAF-throttled: the event sets a flag, the
frame does the work, so a burst of events collapses into one read.

```ts
export type ScrollState = { scrollY: number; vh: number; progress: number }
export function onScroll(fn: (s: ScrollState) => void): () => void
```

`onScroll` registers a subscriber and returns an unsubscribe. The listener attaches on
the first subscription and detaches when the last one leaves. Every subscriber gets the
same `ScrollState`, computed once per frame — no subscriber may call
`getBoundingClientRect` on its own during the frame if the value is already in the state.

`progress` is the document progress of `MOTION_SPEC` §4:
`scrollY / (scrollHeight - vh)`, clamped to `[0, 1]`, and `0` when the document does not
scroll (guard the division by zero).

Also listens to `resize` to refresh `vh`, throttled the same way.

Issues 08 and 09 subscribe here. They must not add a listener of their own.

### 5. `src/lib/motion/math.ts` — pure functions

Starts here and grows with each motion issue. All pure, all unit-tested without a DOM.

```ts
docProgress(scrollY: number, scrollHeight: number, vh: number): number
auroraStyle(p: number): { filter: string; opacity: number; translateY: string }
```

`auroraStyle` implements `MOTION_SPEC` §4 exactly:
`filter: hue-rotate(${p*260}deg) saturate(${1 + 0.4*p})`,
`opacity` ramping `.45 → 1` across the first 40% of the document (so `p ≥ .4` is `1`),
`translateY: ${-12 * p}vh`.

### 6. Reduced motion

A shared `src/lib/motion/reduced.ts` exporting `prefersReducedMotion(): boolean`, used
by every motion module from here on.

With `reduce`: the aurora renders static (no CSS animation, no scroll updates) and
`scroll.ts` never attaches a listener. Content is unaffected — the aurora is decoration.

### 7. Pages

`index.astro` and `en/index.astro` shrink to: import `Base`, set `lang`, render the
content block inside it. All duplicated head markup is gone.

## Acceptance criteria

- [ ] `bun test`: `docProgress` returns 0 at the top, 1 at the bottom, clamps beyond both, and returns 0 when `scrollHeight === vh`.
- [ ] `bun test`: `auroraStyle(p)` matches `MOTION_SPEC` §4 at p=0, p=.2, p=.4 and p=1 — including that opacity reaches 1 at .4 and stays there.
- [ ] `bun test`: `onScroll` runs its subscribers once per frame, not once per event (fire N synthetic scroll events against one rAF tick, assert one call).
- [ ] `bun test`: unsubscribing the last subscriber removes the listener; subscribing again re-attaches it.
- [ ] `bun test`: with `prefers-reduced-motion: reduce`, `onScroll` never attaches a listener.
- [ ] `bun run build` then grep `dist/`: exactly one `addEventListener('scroll'` across all shipped JavaScript.
- [ ] Both pages use `Base.astro`, and `dist/index.html` / `dist/en/index.html` differ only by language-dependent content (same tag structure, same head shape).
- [ ] The head carries: canonical, description, the three hreflang alternates, og:title / og:description / og:url / og:type / og:locale / og:image, twitter:card.
- [ ] The aurora is `aria-hidden`, `pointer-events: none`, and behind the content.
- [ ] With JavaScript disabled, both pages render fully and the aurora still shows.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.

## Out of scope

Nav, hero, any section component, the visible theme toggle, the reveal observer, the
node canvas. The `nav` and `footer` slots stay empty in this block.
