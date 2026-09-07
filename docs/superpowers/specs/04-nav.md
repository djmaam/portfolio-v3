# 04 · Nav — spec

Issue: [PV3-9](https://linear.app/portfolio-djmaam-v3/issue/PV3-9) · Branch: `feat/04-nav`
Design: `handoff/DESIGN_SPEC.md` §3.1, §4 · `handoff/MOTION_SPEC.md` §1 · `docs/superpowers/specs/2026-09-05-portfolio-v3-design.md` §6, §7

> [!NOTE]
> Refined and aligned against the 1200px page container in [20 · Nav Align](./20-nav-align.md).

## Goal

The first real component. It fills the `nav` slot `Base.astro` left empty, and it brings
in the scramble effect that issue 10 reuses for company names.

## Context

`Base.astro` exposes a `nav` slot. Both pages still render a throwaway language-toggle
anchor in their content block — **it gets deleted here**; the real toggle lives in Nav.

Available: `content.ts` (`content`, `links`, `site`), `i18n.ts` (`siblingPath`),
`theme.ts` (`getTheme`, `setTheme`, `toggleTheme`), `motion/reduced.ts`,
`motion/scroll.ts`, `motion/math.ts`.

Nav copy keys in `content.json`: `navAbout`, `navWork`, `navProjects`, `navContact`.

## Scope

### 1. `src/components/Nav.astro`

Props: `lang: Lang`.

Sticky at the top, background `--color-glass`, `backdrop-filter: blur(18px) saturate(1.4)`,
`border-bottom: 1px solid var(--color-line)`. Height 64px — the same number the
anchor-scroll offset uses, so define it once as a CSS variable (`--nav-h`) and read it
from both places.

**Left**: the ✳ glyph + `site.name`.
**Right**: four anchor links, the language toggle, the theme toggle.

### 2. Anchor links

`navAbout` → `#about`, `navWork` → `#work`, `navProjects` → `#projects`,
`navContact` → `#contact`.

**None of those sections exist yet** — they arrive with issues 08 to 13. The links ship
anyway, and the smooth-scroll handler must no-op when the target is missing rather than
throw. Do not create placeholder sections to make the links resolve.

Click → `scrollTo({ behavior: 'smooth' })` at the element's offset minus `--nav-h`.
`#top` scrolls to 0 with no offset. With `reduce`, jump without smoothing.

Hidden below 720px. No mobile menu is designed: the toggles stay, the links disappear.

### 3. Language toggle

Moves here from the page scaffold, unchanged in behavior: a real `<a>` to
`siblingPath(pathname, otherLang)` that writes `localStorage.lang` on click. Label is
the language pair, active one emphasized (`ES / en`).

Base's inline script already owns the click handler that persists the choice; keep that
wiring rather than duplicating it.

### 4. Theme toggle

A `<button>` with a half-filled circle icon (CSS, not an image): a circle where half is
`currentColor` and half is transparent, rotated to read as a moon/sun hybrid.

`aria-label` from a new key — **`content.json` has no key for it and is read-only**, so
the label goes in `src/lib/ui.ts` as `{ es: {...}, en: {...} }` alongside `site`. Same
rationale as `site`: UI chrome, not translatable page copy. Ship both languages.

`aria-pressed` reflects dark mode. On click, `toggleTheme()` and update `aria-pressed`.
The button reads its initial state from `document.documentElement.dataset.theme`, which
Base's inline script has already set before first paint — never from `matchMedia`
directly, or the button and the page can disagree.

### 5. `src/lib/motion/scramble.ts` + math

The pure frame function goes in `math.ts`, the timing driver in `scramble.ts`.

```ts
// math.ts
scrambleFrame(target: string, p: number, rand?: () => number): string
```

- Glyph pool: `<>/_-=+*#%&{}[]|\01`
- Resolved prefix length: `n = Math.floor(p ** 2 * target.length)` — quadratic, so it
  resolves left to right and accelerates.
- Characters past `n` are replaced by a random glyph; **spaces are always preserved**,
  resolved or not.
- `rand` is injectable so tests are deterministic. Defaults to `Math.random`.

```ts
// scramble.ts
scramble(el: HTMLElement, duration: number): void
```

Drives `scrambleFrame` over `duration` with rAF, writing `textContent`. No-op under
`reduce` (leaves the resolved text).

Schedule on the brand: 1100ms at load after a 300ms delay, 900ms every 9s, 700ms on
`mouseenter`. The brand element carries `min-width: 9.2em` so the layout never shifts.

Issue 10 imports the same `scramble` for company names — do not write a second copy
there.

### 6. ✳ glyph

`animation: think 2.6s cubic-bezier(.6,.05,.3,1) infinite`, `text-shadow: 0 0 10px var(--color-accent)`.
The keyframe already exists in `app.css`. `aria-hidden`.

### 7. Pages

Both pages pass `<Nav slot="nav" lang={lang} />` into `Base`, and drop the throwaway
toggle anchor.

## Acceptance criteria

- [ ] `bun test`: `scrambleFrame(s, p, rand)` preserves length and space positions for p ∈ {0, .25, .5, .75, 1}.
- [ ] `bun test`: `scrambleFrame(s, 1, rand) === s`, and at p=0 every non-space character comes from the glyph pool.
- [ ] `bun test`: the resolved prefix grows monotonically with p, and `n = floor(p² · len)` exactly.
- [ ] `bun test`: `anchorOffset(top, navH)` — the scroll target math — returns `top - navH`, and 0 for `#top`.
- [ ] `bun test`: with `reduce`, `scramble` leaves `textContent` untouched.
- [ ] Nav copy comes from `content.json`; the theme-toggle label from `ui.ts`. No literal strings in the component.
- [ ] The theme toggle's `aria-pressed` matches `documentElement.dataset.theme` on load, in both themes, and flips on click.
- [ ] Clicking a nav link whose section does not exist yet does not throw.
- [ ] The brand's width does not change while scrambling.
- [ ] With JavaScript disabled: nav renders, the language toggle works, the anchors are plain links, the brand shows its resolved text.
- [ ] Links are hidden below 720px; both toggles remain reachable.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.

## Out of scope

Focus rings and the full a11y audit (issue 16). The sections the anchors point at
(issues 08-13). Any mobile menu.
