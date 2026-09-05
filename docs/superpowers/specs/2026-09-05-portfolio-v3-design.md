# portfolio-v3 — Diseño técnico

Fecha: 2026-09-05 · Fuente de verdad de diseño: `handoff/`

## 1. Objetivo y alcance

Construir `marcosarrieta.dev`: sitio estático bilingüe (ES/EN), tema claro/oscuro,
con el diseño y las animaciones definidos en `handoff/DESIGN_SPEC.md` y
`handoff/MOTION_SPEC.md`, y todo el copy desde `handoff/content.json`.

**Dentro de v1:** las nueve secciones (nav, hero, consola decorativa, red de nodos,
about, método, experiencia, proyectos, stack, contacto, footer), motion completo,
i18n, tema, accesibilidad, tests, deploy en Cloudflare Pages.

**Fuera de v1:** la consola-agente interactiva de `AGENT_CONSOLE_SPEC.md` (Worker +
API de Anthropic). Se especifica y construye como v1.1 con su propio ciclo.
El modo juego 3D (`/world`) no está en alcance ni reserva ruta todavía.

## 2. Stack

| Pieza | Decisión |
|---|---|
| Framework | Astro 7, salida estática (`output: 'static'`) |
| Runtime / PM / tests | Bun (`bun test`) |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind v4 vía `@tailwindcss/vite`, tokens en `@theme` |
| Motion | Vanilla TS (IntersectionObserver + rAF). Sin Framer, sin GSAP |
| Fuentes | **Manrope** variable (sans, `wght 200..800`) + **IBM Plex Mono** estático 400/500 (mono) — IBM Plex Mono no tiene versión variable. Self-hosted woff2 en `public/fonts`, `font-display: swap` |
| E2E | Playwright (smoke) |
| Deploy | Cloudflare Pages, build estático |

**Corrección al handoff:** `handoff/reference/Portfolio.dc.html` no es JS vanilla —
es un componente del runtime `dc` (clase con `setState` y refs, estilos inline).
Portable: la *matemática* (proyección del canvas, scramble, progreso del scroll,
cálculo de pasos, opacidad por palabra). No portable: el plumbing de estado/refs y
el CSS entero, que se reescribe en Tailwind desde `DESIGN_SPEC.md`.

**Corrección al handoff:** la decisión de fuente era Geist vs Manrope; queda
**Manrope**, con `-apple-system, "Helvetica Neue", sans-serif` de fallback. La mono es
IBM Plex Mono en pesos estáticos 400 y 500: no existe una versión variable.

**Corrección al handoff:** `ARCHITECTURE.md` dice Astro 5, que era la versión vigente
cuando se escribió. El proyecto quedó en **Astro 7**, la última. Nada de lo planificado
depende de APIs de la 5.

**Sin framework de UI en v1.** No entra React ni ningún otro. Las secciones son HTML
estático alimentado por `content.json` (cero estado de UI) y el motion es imperativo
sobre el DOM (rAF, canvas, IntersectionObserver), donde un framework solo agrega una
capa que después se esquiva con refs. El costo sería ~45 KB de JS contra un
presupuesto de Lighthouse ≥ 90 mobile con el canvas corriendo.

Único candidato: la consola-agente de v1.1, que sí tiene estado (historial,
streaming, expandir/colapsar). Entra como **isla única** (`bunx astro add react` +
un `.tsx` con `client:visible`) sin tocar nada de lo construido en v1. Decisión
diferida a esa etapa.

## 3. Estructura

```
src/
  styles/app.css          # @import tailwindcss; @theme tokens; keyframes; utilidades sueltas
  lib/
    content.ts            # import tipado de handoff/content.json
    i18n.ts               # Lang, rutas hermanas, detección/persistencia
    motion/
      network.ts          # canvas de nodos (clase + funciones puras de proyección)
      scramble.ts
      reveal.ts           # IntersectionObserver + [data-reveal] + [data-delay]
      scroll.ts           # único listener rAF: aurora + about + método
      boot.ts             # secuencia del hero
      consoleLog.ts       # ciclo del log decorativo + métricas
      math.ts             # funciones puras compartidas (testeadas sin DOM)
  layouts/Base.astro
  components/
    Nav.astro Hero.astro Console.astro About.astro Method.astro
    Experience.astro Projects.astro Stack.astro Contact.astro Footer.astro
  pages/index.astro       # es
  pages/en/index.astro
public/fonts/ public/logos/ public/previews/ public/og.png public/favicon.svg
tests/                    # bun test
e2e/                      # Playwright
docs/superpowers/specs/   # este doc + una spec por issue
```

## 4. Tokens y tema

Los tokens de `DESIGN_SPEC.md §2` viven en `@theme` de Tailwind como variables CSS
con `light-dark(light, dark)`. El `:root` lleva `color-scheme`.

```css
@theme {
  --color-bg:      light-dark(#F4F5F7, #08090C);
  --color-ink:     light-dark(#0B0D12, #F3F5F9);
  --color-dim:     light-dark(#5E6675, #8B94A7);
  --color-accent:  light-dark(#0A8FAF, #3EE7FF);
  /* … line, surface, glass, accent-soft, violet, console-bg, contact-card */
}
```

Regla: **ningún color literal en un componente**. Solo `text-ink`, `bg-bg`,
`border-line`, etc. Un test de lint (grep en CI) falla si aparece un hex fuera de
`app.css`.

Tema: script inline en `<head>` de `Base.astro`, antes de cualquier CSS, que lee
`localStorage.theme` o `prefers-color-scheme` y setea `color-scheme` en `<html>`.
El toggle escribe `localStorage` y actualiza el atributo. Sin flash.

Escala tipográfica: `clamp()` equivalente a los `cqw` del mock (`DESIGN_SPEC.md §2`),
declarada como `--text-*` en `@theme`.

## 5. Contenido e i18n

`handoff/content.json` sigue siendo la única fuente. `src/lib/content.ts` lo importa
y exporta tipos derivados:

```ts
import raw from '../../handoff/content.json'
export type Lang = 'es' | 'en'
export type Content = (typeof raw)['i18n']['es']
export const content: Record<Lang, Content> = raw.i18n
export const { links, stack, consoleLog } = raw
```

Rutas: `/` (es) y `/en` (en). Cada página pasa `t = content[lang]` a los componentes.
Toggle de idioma = `<a>` real a la ruta hermana + `localStorage.lang`; en el primer
load, si `localStorage.lang` no coincide con la ruta, se redirige una sola vez.
`<link rel="alternate" hreflang>` en ambas.

Invariante testeada: las claves de `es` y `en` son idénticas, y `jobs`, `projects`,
`steps`, `principles`, `stepVerbs` tienen el mismo largo en ambos idiomas.

## 6. Motion

Todo el motion vive detrás de `@media (prefers-reduced-motion: no-preference)` y de
un guard en JS (`matchMedia('(prefers-reduced-motion: reduce)')`). Con `reduce`: el
contenido está visible desde el primer frame y el canvas no se monta.

Progressive enhancement: los estados iniciales `opacity:0` se aplican solo bajo
`html.has-js` (clase que setea el script inline del head). Sin JS, el sitio se lee
entero.

Un solo listener de scroll rAF-throttled (`scroll.ts`) alimenta aurora, palabras de
"Sobre mí" y el sticky de "Cómo trabajo".

**Estrategia de testeo del motion:** toda la matemática sale a funciones puras en
`motion/math.ts`, testeables con `bun test` sin DOM:

- `stepFromProgress(p) → { active, done }` (`MOTION_SPEC §7`)
- `wordOpacity(i, n, p) → number` (`§6`)
- `collapseFactor(scrollY, vh) → 0..1` (`§3`)
- `scrambleFrame(target, p) → string` (`§1`)
- `projectNode(node, cam) → { x, y, sc, alpha }` (`§3`)
- `bootDelay(n) → ms` (`§2`)

Lo que toca el DOM (observers, canvas, listeners) se cubre con el smoke de Playwright.

## 7. Accesibilidad

- Focus visible en todo lo interactivo: anillo `2px` accent, offset 2px (no está en
  el mock; se agrega).
- Toggles con `aria-label` y `aria-pressed`. Íconos decorativos `aria-hidden`.
- Canvas del hero `aria-hidden` + `pointer-events: none`.
- Contraste `dim` sobre `bg` ≥ 4.5:1 en ambos temas, verificado en el issue de a11y.
- Cian como color de texto solo en ≥ 15px o peso 500.

## 8. Proyectos: previews

Chequeo de headers hecho el 2026-09-05:

| Sitio | Resultado | Preview |
|---|---|---|
| nera-agro.com | sin restricción | iframe |
| agropro.ag | sin restricción | iframe |
| kodaiverse.com | sin restricción | iframe |
| masushuaia.com | sin restricción | iframe |
| creativamedialab.com | `X-Frame-Options: DENY` + `frame-ancestors 'none'` | screenshot en `public/previews` |
| telecentro.com.ar | no responde a `curl` (WAF) | screenshot en `public/previews` |

iframe: `loading="lazy"`, `sandbox`, `pointer-events:none`, `aria-hidden`,
`transform: scale(.25)` dentro de un contenedor 16:11. Fallback declarativo por
proyecto en un campo del componente, no por detección en runtime.

## 9. Calidad y CI

- `bun test` — content (paridad es/en) y `motion/math.ts`.
- `bun run lint` — ESLint + Prettier + el grep anti-hex.
- `bun run build` — Astro estático.
- Playwright smoke: boot del hero visible, toggle de tema, toggle de idioma navega a
  `/en`, un reveal dispara al scrollear, el sticky del método avanza de paso.
- Lighthouse CI ≥ 90 en las cuatro métricas, mobile. Si Performance no llega,
  degradar en orden: shimmer → aurora → nodos.
- GitHub Actions corre lint + test + build en cada PR.

## 10. Flujo de trabajo (SDD + TDD)

Un issue de Linear = un bloque = una PR. Por issue:

1. Se escribe la spec en `docs/superpowers/specs/NN-<bloque>.md` con criterios de
   aceptación verificables. La spec se commitea antes de codear.
2. Rama `feat/NN-<bloque>`.
3. Un subagente implementa con tests primero (los criterios de aceptación son los
   tests). Elección de subagente por tipo de tarea:
   - `feature-dev:code-architect` cuando la spec necesita diseño previo
   - `general-purpose` para implementación
   - `feature-dev:code-reviewer` antes del merge
4. Review, merge a `main`, issue a Done.

Se paralelizan solo bloques que no tocan los mismos archivos (Experiencia +
Proyectos sí; cualquier cosa contra Base o tokens, no).

## 11. Backlog

| # | Bloque | Depende de |
|---|---|---|
| 00 | Scaffold: Bun + Astro + TS strict + Tailwind v4 + ESLint/Prettier + CI | — |
| 01 | Tokens, escala tipográfica, tema claro/oscuro sin flash, fuentes Manrope + IBM Plex Mono | 00 |
| 02 | `content.ts` + i18n + rutas `/` y `/en` + toggle | 00 |
| 03 | `Base.astro`: head, preload de fuentes, aurora, contenedor, separadores | 01, 02 |
| 04 | Nav: glass, links, scramble de la marca, ✳, toggles | 03 |
| 05 | Hero: markup, H1, CTAs, stats, secuencia de boot | 03 |
| 06 | Consola decorativa: log cíclico, métricas, scanlines, sweep | 05 |
| 07 | Canvas de red de nodos: elipsoide, conexiones, formación ✳, comandos, cursor, colapso | 06 |
| 08 | Sobre mí: lead con palabras que se iluminan, párrafo, 3 principios | 03 |
| 09 | Cómo trabajo: sticky de 5 pasos, semáforo, indicador de estado | 03 |
| 10 | Experiencia: timeline, dots, chips, scramble de empresa, caja "también con" | 03 |
| 11 | Proyectos: grid, previews (iframe/screenshot), shimmer, hover | 03 |
| 12 | Stack: 3 marquesinas, pausa en hover, máscaras, leyenda | 03 |
| 13 | Contacto: tarjeta invertida, borde cónico girando, grilla, email, pills | 03 |
| 14 | Footer: firma, ✳, ASCIImoji rotativo | 03 |
| 15 | Logos de empresas (placeholder → assets reales) — *a planificar, sin definir* | 10 |
| 16 | A11y: focus rings, contraste, aria, auditoría de reduced-motion | 04–14 |
| 17 | Playwright smoke + Lighthouse CI | 16 |
| 18 | Deploy en Cloudflare Pages + dominio + Email Routing | 17 |

## 12. Pendientes del usuario (no bloquean)

- Fecha de inicio en Nera (hoy "abr. 2023 — hoy").
- Rol y stack definitivos de Creativa Media Lab y Kodai (los del mock son supuestos).
- Logos de empresas (issue 15) y screenshots de los dos previews que no aceptan iframe.
- Renovar `marcosarrieta.ar` y redirigir 301 al `.dev` si tuvo tráfico.
