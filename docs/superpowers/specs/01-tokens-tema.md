# 01 · Tokens, tipografía y tema — spec

Issue: [PV3-6](https://linear.app/portfolio-djmaam-v3/issue/PV3-6) · Rama: `feat/01-tokens-tema`
Diseño: `docs/superpowers/specs/2026-09-05-portfolio-v3-design.md` §4 · `handoff/DESIGN_SPEC.md` §2

## Objetivo

El sistema de diseño completo, consumible por cualquier componente posterior. Después
de este bloque, ningún issue vuelve a definir un color, un tamaño de fuente ni un
keyframe.

## Contexto

`src/styles/app.css` hoy tiene solo `@import "tailwindcss";`. Tailwind 4.3.3 vía
`@tailwindcss/vite`. No hay layout ni componentes todavía: `src/pages/index.astro` es
un placeholder que se puede usar como banco de pruebas y lo reemplaza el issue 02.

## Alcance

### 1. Tokens de color

En `@theme`, todos los de `DESIGN_SPEC.md` §2 con `light-dark(light, dark)`:

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

`:root` lleva `color-scheme` — sin eso `light-dark()` no resuelve.

**Restricción importante de Tailwind v4:** los modificadores de opacidad
(`bg-accent/45`) **no funcionan** sobre un color declarado con `light-dark()`, porque
Tailwind no puede recalcular el alfa. Por eso cada variante con alfa que el diseño usa
más de una vez va como token propio. Las que aparecen una sola vez (bordes de hover a
`.45`, `.06`, `.07`) se resuelven con `color-mix(in srgb, var(--color-accent) 45%, transparent)`
en la utilidad que las necesite, no con el modificador de Tailwind.

### 2. Escala tipográfica

Los tamaños de la tabla de `DESIGN_SPEC.md` §2 como `--text-*` en `@theme`. El mock usa
`cqw` sobre un contenedor de 1200px; acá van como `clamp()` equivalente:

| Token | Valor |
|---|---|
| `--text-h1` | `clamp(36px, 5.5vw, 76px)` · peso 600 · tracking `-.04em` · línea 1.0 |
| `--text-h2` | `clamp(32px, 4.5vw, 56px)` · 600 · `-.035em` · 1.02 |
| `--text-h2-stack` | `clamp(32px, 4.5vw, 48px)` · 600 · `-.035em` · 1.05 |
| `--text-h2-contact` | `clamp(34px, 5vw, 64px)` · 600 · `-.04em` · 1.0 |
| `--text-lead` | `clamp(26px, 3.4vw, 40px)` · 500 · `-.025em` · 1.2 |
| `--text-hero-sub` | `clamp(16px, 1.5vw, 19px)` · 400 · 1.55 |
| `--text-body` | `17px` · 400 · 1.5 |
| `--text-card-title` | `clamp(19px, 1.8vw, 22px)` · 500 · `-.02em` · 1.15 |
| `--text-label` | `12px` mono · tracking `.14em` |
| `--text-label-sm` | `clamp(10px, 1vw, 11px)` mono · tracking `.1em` |

Tracking y line-height van como `--tracking-*` / `--leading-*` acompañando cada rol.

### 3. Fuentes

Self-hosted en `public/fonts`, descargadas de Google Fonts, subset **latin**
(`U+0000-00FF` cubre todos los acentos del español, `¿` y `¡`):

| Archivo | Origen | Uso |
|---|---|---|
| `manrope-var.woff2` | `https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSvfedN4.woff2` | variable, `font-weight: 200 800` |
| `ibm-plex-mono-400.woff2` | `https://fonts.gstatic.com/s/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3twJwlBFgsAXHNk.woff2` | mono 400 |
| `ibm-plex-mono-500.woff2` | `https://fonts.gstatic.com/s/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3twJwl5FgsAXHNlYzg.woff2` | mono 500 |

`@font-face` a mano con `font-display: swap`. Tokens `--font-sans` (Manrope +
`-apple-system, "Helvetica Neue", sans-serif`) y `--font-mono` (IBM Plex Mono +
`ui-monospace, monospace`).

`preload` de **dos** archivos: `manrope-var.woff2` y `ibm-plex-mono-400.woff2`. El 500
no se precarga (aparece más abajo en la página). Como todavía no hay layout, los
`<link rel="preload">` van en `src/pages/index.astro` y el issue 03 los mueve a
`Base.astro`.

**IBM Plex Mono no tiene versión variable en Google Fonts** — por eso van dos estáticos
y no un archivo variable, contra lo que decía `ARCHITECTURE.md`.

### 4. Keyframes

Los 12 del mock, tal cual `handoff/reference/Portfolio.dc.html`: `blink`, `pulse`,
`aur1`, `aur2`, `rise`, `think`, `sweep`, `spin`, `gridflow`, `shimmer`, `marquee`.
Van en `app.css`, fuera de `@theme`. No se usan todavía; cada issue los consume.

### 5. Tema sin flash

Script inline en el `<head>`, **antes** de cualquier `<link rel="stylesheet">`:

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

Mientras no exista `Base.astro`, va en `index.astro`; el issue 03 lo mueve.

`src/lib/theme.ts` exporta `getTheme()`, `setTheme(t)` y `toggleTheme()` — escriben
`localStorage.theme`, `documentElement.style.colorScheme` y `dataset.theme`. El botón
que las usa es del issue 04.

`.has-js` existe para el progressive enhancement de los issues de motion: los estados
iniciales `opacity: 0` se aplican solo bajo esa clase.

### 6. Lint anti-hex

`scripts/check-tokens.ts`, corrido por `bun run lint`: falla si aparece un color
literal (`#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(`, `rgba(`, `hsl(`) en `src/`,
**excepto** en `src/styles/app.css`. Reporta archivo, línea y el color encontrado.

Ignora: `handoff/`, `public/`, `dist/`, `node_modules/`, `tests/`.

## Criterios de aceptación

- [ ] `bun test`: cada token de `DESIGN_SPEC.md` §2 existe en `app.css` (el test parsea el CSS y compara contra la lista esperada, no es un snapshot).
- [ ] `bun test`: los 11 keyframes están declarados.
- [ ] `bun test`: `getTheme()` devuelve el valor de `localStorage` si es válido, y cae a `prefers-color-scheme` si no lo es o no existe.
- [ ] `bun test`: el script anti-hex falla sobre un archivo de prueba con un hex y pasa sobre uno con `var(--color-*)`.
- [ ] Con `localStorage.theme = 'dark'` y red throttleada, no hay flash claro antes del primer paint.
- [ ] Sin `localStorage.theme`, el tema sigue a `prefers-color-scheme`.
- [ ] Las tres fuentes cargan desde `/fonts/`; cero requests a `fonts.googleapis.com` o `fonts.gstatic.com` en el network panel.
- [ ] `bun run lint`, `bun test` y `bun run build` pasan.

## Fuera de alcance

Componentes, layout, nav, toggles visibles, motion, contenido. El botón de tema es del
issue 04; acá solo queda la API en `theme.ts`.
