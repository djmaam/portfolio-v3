# ARCHITECTURE — portfolio-v3

## Stack (decidido)

- **Astro 5** (islands; el sitio es estático salvo el endpoint del agente).
- **Bun** como runtime, package manager y test runner.
- **TypeScript** estricto.
- Estilos: **CSS nativo** con variables + `light-dark()` (o Tailwind v4 si se prefiere; las clases utilitarias no deben esconder los tokens). Sin librerías de componentes.
- Motion: **vanilla** (IntersectionObserver + rAF), sin Framer/GSAP. El canvas del hero es un módulo TS aparte.
- i18n: rutas `/` (es) y `/en` con `content.ts` tipado; toggle en cliente que navega a la ruta hermana y persiste en `localStorage`.
- Tema: script inline en `<head>` que aplica `color-scheme` antes del primer paint (evita flash), toggle persiste en `localStorage`.
- Fuentes: self-hosted en `public/fonts` (Geist / Geist Mono, woff2 variable), `font-display: swap`, `preload` de las dos.
- Deploy: **Cloudflare Pages**. El endpoint del agente en un **Cloudflare Worker** (o adapter `@astrojs/cloudflare` en modo hybrid).
- Email: `hi@marcosarrieta.dev` vía Cloudflare Email Routing.
- Calidad: Prettier + ESLint, `bun test` para `content` y utilidades, Playwright para smoke (hero boot, toggles, reveal). Lighthouse CI ≥ 90 en las cuatro métricas.

## Estructura propuesta

```
portfolio-v3/
  handoff/                  # este paquete (fuente de verdad de diseño)
  public/
    fonts/  previews/  logos/  og.png  favicon.svg
  src/
    styles/tokens.css       # variables light-dark, escala tipográfica, keyframes
    lib/content.ts          # export tipado de handoff/content.json (es/en)
    lib/motion/
      reveal.ts             # IntersectionObserver + data-reveal / data-delay
      scroll.ts             # único listener: aurora, about words, método
      scramble.ts           # texto consola
      boot.ts               # secuencia del hero
      network.ts            # canvas nodos (clase, sin dependencias)
    layouts/Base.astro      # head, theme script, fonts, nav, footer
    components/
      Nav.astro  Hero.astro  Console.astro  About.astro  Method.astro
      Experience.astro  Projects.astro  Stack.astro  Contact.astro  Footer.astro
      islands/ConsoleAgent.tsx   # única isla con estado (solo si se implementa el agente)
    pages/index.astro  pages/en/index.astro
    pages/api/agent.ts      # o worker/ aparte
  worker/agent/             # Cloudflare Worker del agente (si va separado)
```

## Decisiones

- **Un solo archivo de contenido.** Los componentes reciben `t = content[lang]`. Cualquier texto nuevo se agrega ahí en ambos idiomas.
- **Previews de proyectos**: preferencia por `iframe` estático (`loading="lazy"`, `sandbox`, `pointer-events:none`, escalado con `transform: scale(.25)` dentro de un contenedor 16:11). Fallback a screenshot en `public/previews` para sitios que bloquean iframes (`X-Frame-Options`). Decidir por sitio en la spec de esa tarea.
- **Logos de empresas**: `public/logos/*.svg`, 56px, monocromos si es posible. Hasta tenerlos, mantener el placeholder rayado con abreviatura.
- **Sin JS para lo que no lo necesita**: nav, secciones y reveals funcionan con contenido visible si JS falla (progressive enhancement: los estados iniciales `opacity:0` se aplican solo cuando `html.has-js`).
- **Modo juego 3D (futuro)**: no aparece en el diseño. Cuando exista, se linkea desde nav/footer; reservar ruta `/world`.

## Pendientes del usuario

- Fechas: Nera "abr. 2023 — hoy" (confirmar mes de inicio).
- Rol/stack definitivo de Creativa Media Lab y Kodai (los del mock son supuestos).
- Logos y previews.
- Decidir tipografía final (Geist vs Manrope; el mock tiene el tweak).
- Renovar `marcosarrieta.ar` un año y redirigir 301 al `.dev` si tuvo tráfico.
