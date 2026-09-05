# 01 · Tokens, typography and theme — spec

Issue: [PV3-6](https://linear.app/portfolio-djmaam-v3/issue/PV3-6) · Branch: `feat/01-tokens-tema`
Design: `docs/superpowers/specs/2026-09-05-portfolio-v3-design.md` §4 · `handoff/DESIGN_SPEC.md` §2

## Goal

The complete design system, consumable by any later component. After this block, no
issue defines a colour, a font size or a keyframe again.

## Context

`src/styles/app.css` today has only `@import "tailwindcss";`. Tailwind 4.3.3 via
`@tailwindcss/vite`. There is no layout or components yet: `src/pages/index.astro` is a
placeholder that can be used as a test bench and issue 02 replaces it.

## Scope

### 1. Colour tokens

In `@theme`, all of the ones from `DESIGN_SPEC.md` §2 with `light-dark(light, dark)`:

```css
@theme {
  --color-bg:           light-dark(#F4F5F7, #08090C);
  --color-ink:          light-dark(#0B0D12, #F3F5F9);
  --color-dim:          light-dark(#5E6675, #8B94A7);
  --color-line:         light-dark(rgba(0,0,0,.08), rgba(255,255,255,.08));
  --color-surface:      light-dark(rgba(255,255,255,.7), rgba(255,255,255,.035));
  --color-glass:        light-dark(rgba(244,245,247,.72), rgba(8,9,12,.6));
  --color-accent:       light-dark(#0A8FAF, #3EE7FF);
  --color-accent-soft:  light-dark(rgba(10,143,175,.08), rgba(62,231,255,.08));
  --color-violet:       light-dark(rgb(120,90,255), rgb(170,120,255));
  --color-console-bg:   light-dark(rgba(255,255,255,.75), rgba(14,16,22,.85));
  --color-contact-card: light-dark(#0B0D12, #F3F5F9);
  --color-contact-ink:  light-dark(#F3F5F9, #0B0D12);
  --color-step-1: #FF5C5C;  /* … step-2 #FF9F43, step-3 #FFD64D, step-4 #9BE15D, step-5 #3DDC84 */
}
```

`:root` carries `color-scheme` — without it `light-dark()` does not resolve.

**Important Tailwind v4 constraint:** the opacity modifiers
(`bg-accent/45`) **do not work** on a colour declared with `light-dark()`, because
Tailwind cannot recompute the alpha. That is why every alpha variant the design uses
more than once goes in as its own token. The ones that show up a single time (hover
borders at `.45`, `.06`, `.07`) are resolved with `color-mix(in srgb, var(--color-accent) 45%, transparent)`
in the utility that needs them, not with the Tailwind modifier.

### 2. Typographic scale

The sizes from the `DESIGN_SPEC.md` §2 table as `--text-*` in `@theme`. The mock uses
`cqw` over a 1200px container; here they go in as the equivalent `clamp()`:

| Token | Value |
|---|---|
| `--text-h1` | `clamp(36px, 5.5vw, 76px)` · weight 600 · tracking `-.04em` · line 1.0 |
| `--text-h2` | `clamp(32px, 4.5vw, 56px)` · 600 · `-.035em` · 1.02 |
| `--text-h2-stack` | `clamp(32px, 4.5vw, 48px)` · 600 · `-.035em` · 1.05 |
| `--text-h2-contact` | `clamp(34px, 5vw, 64px)` · 600 · `-.04em` · 1.0 |
| `--text-lead` | `clamp(26px, 3.4vw, 40px)` · 500 · `-.025em` · 1.2 |
| `--text-hero-sub` | `clamp(16px, 1.5vw, 19px)` · 400 · 1.55 |
| `--text-body` | `17px` · 400 · 1.5 |
| `--text-card-title` | `clamp(19px, 1.8vw, 22px)` · 500 · `-.02em` · 1.15 |
| `--text-label` | `12px` mono · tracking `.14em` |
| `--text-label-sm` | `clamp(10px, 1vw, 11px)` mono · tracking `.1em` |

Tracking and line-height go in as `--tracking-*` / `--leading-*` accompanying each role.

### 3. Fonts

Self-hosted in `public/fonts`, downloaded from Google Fonts, **latin** subset
(`U+0000-00FF` covers every Spanish accent, `¿` and `¡`):

| File | Source | Use |
|---|---|---|
| `manrope-var.woff2` | `https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSvfedN4.woff2` | variable, `font-weight: 200 800` |
| `ibm-plex-mono-400.woff2` | `https://fonts.gstatic.com/s/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3twJwlBFgsAXHNk.woff2` | mono 400 |
| `ibm-plex-mono-500.woff2` | `https://fonts.gstatic.com/s/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3twJwl5FgsAXHNlYzg.woff2` | mono 500 |

Hand-written `@font-face` with `font-display: swap`. Tokens `--font-sans` (Manrope +
`-apple-system, "Helvetica Neue", sans-serif`) and `--font-mono` (IBM Plex Mono +
`ui-monospace, monospace`).

`preload` of **two** files: `manrope-var.woff2` and `ibm-plex-mono-400.woff2`. The 500
is not preloaded (it shows up further down the page). Since there is no layout yet, the
`<link rel="preload">` tags go in `src/pages/index.astro` and issue 03 moves them to
`Base.astro`.

**IBM Plex Mono has no variable version on Google Fonts** — that is why there are two
static files and not one variable file, contrary to what `ARCHITECTURE.md` said.

### 4. Keyframes

The 12 from the mock, exactly as in `handoff/reference/Portfolio.dc.html`: `blink`,
`pulse`, `aur1`, `aur2`, `rise`, `think`, `sweep`, `spin`, `gridflow`, `shimmer`,
`marquee`. They go in `app.css`, outside `@theme`. They are not used yet; each issue
consumes them.

### 5. Theme without flash

Inline script in the `<head>`, **before** any `<link rel="stylesheet">`:

```js
;(function () {
  var t = localStorage.getItem('theme')
  if (t !== 'light' && t !== 'dark')
    t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  var r = document.documentElement
  r.style.colorScheme = t
  r.dataset.theme = t
  r.classList.add('has-js')
})()
```

While `Base.astro` does not exist, it goes in `index.astro`; issue 03 moves it.

`src/lib/theme.ts` exports `getTheme()`, `setTheme(t)` and `toggleTheme()` — they write
`localStorage.theme`, `documentElement.style.colorScheme` and `dataset.theme`. The
button that uses them belongs to issue 04.

`.has-js` exists for the progressive enhancement of the motion issues: the initial
`opacity: 0` states apply only under that class.

### 6. Anti-hex lint

`scripts/check-tokens.ts`, run by `bun run lint`: fails if a literal colour
(`#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(`, `rgba(`, `hsl(`) shows up in `src/`,
**except** in `src/styles/app.css`. It reports file, line and the colour found.

Ignores: `handoff/`, `public/`, `dist/`, `node_modules/`, `tests/`.

## Acceptance criteria

- [ ] `bun test`: every token from `DESIGN_SPEC.md` §2 exists in `app.css` (the test parses the CSS and compares against the expected list, it is not a snapshot).
- [ ] `bun test`: the 11 keyframes are declared.
- [ ] `bun test`: `getTheme()` returns the `localStorage` value if it is valid, and falls back to `prefers-color-scheme` if it is not or does not exist.
- [ ] `bun test`: the anti-hex script fails on a test file with a hex and passes on one with `var(--color-*)`.
- [ ] With `localStorage.theme = 'dark'` and a throttled network, there is no light flash before the first paint.
- [ ] Without `localStorage.theme`, the theme follows `prefers-color-scheme`.
- [ ] The three fonts load from `/fonts/`; zero requests to `fonts.googleapis.com` or `fonts.gstatic.com` in the network panel.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.

## Out of scope

Components, layout, nav, visible toggles, motion, content. The theme button belongs to
issue 04; here only the API in `theme.ts` is left.
