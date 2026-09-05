# 00 · Scaffold — spec

Issue: [PV3-5](https://linear.app/portfolio-djmaam-v3/issue/PV3-5) · Rama: `feat/00-scaffold`
Diseño: `docs/superpowers/specs/2026-09-05-portfolio-v3-design.md` §2, §3, §9

## Objetivo

Dejar el repo listo para que cualquier issue posterior solo agregue componentes y
estilos. Nada de contenido, diseño ni motion en este bloque.

## Contexto

El repo hoy tiene `handoff/` (fuente de verdad de diseño, **no se toca**), `docs/` y
`README.md`. Bun 1.4.0 instalado. Rama `main`, limpia.

## Alcance

### 1. Proyecto Astro

`bunx create-astro@latest . --template minimal --typescript strict --no-install --no-git --skip-houston --yes`
sobre el directorio existente, cuidando de no pisar `handoff/`, `docs/`, `README.md`
ni `.git`. Después `bun install`.

`astro.config.mjs`:

```js
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  output: 'static',
  site: 'https://marcosarrieta.dev',
  vite: { plugins: [tailwindcss()] },
})
```

`tsconfig.json`: extiende `astro/tsconfigs/strict`. Alias `@/*` → `src/*`.

### 2. Tailwind v4

`@tailwindcss/vite` (no el plugin de PostCSS, no `astro add tailwind`).
`src/styles/app.css` con **solo** `@import "tailwindcss";` — los tokens son del
issue 01. Importado desde una página para que entre al build.

### 3. Estructura

Crear los directorios de la spec §3 que van a existir sí o sí. Los vacíos llevan
`.gitkeep`:

```
src/styles/app.css
src/lib/            .gitkeep
src/lib/motion/     .gitkeep
src/layouts/        .gitkeep
src/components/     .gitkeep
src/pages/index.astro
public/fonts/       .gitkeep
public/logos/       .gitkeep
public/previews/    .gitkeep
tests/scaffold.test.ts
```

`src/pages/index.astro` es un placeholder mínimo con una clase de Tailwind aplicada,
suficiente para probar que el pipeline funciona. Lo reemplaza el issue 02.

### 4. Herramientas

- **Prettier** con `prettier-plugin-astro`. Config en `.prettierrc`.
- **ESLint** flat config (`eslint.config.js`) con `typescript-eslint` +
  `eslint-plugin-astro`. Sin reglas custom más allá de los recommended.
- Scripts en `package.json`:
  - `dev`, `build`, `preview` (Astro)
  - `lint` → `eslint . && prettier --check .`
  - `format` → `prettier --write .`
  - `test` → `bun test`
- `.gitignore`: `node_modules`, `dist`, `.astro`, `.DS_Store`, `.env*`.
- **Borrar el `.DS_Store` que está commiteado en la raíz.**

### 5. CI

`.github/workflows/ci.yml`, en `push` a `main` y en `pull_request`:
`oven-sh/setup-bun` → `bun install --frozen-lockfile` → `bun run lint` →
`bun test` → `bun run build`.

### 6. Test

`tests/scaffold.test.ts`: un test real, no trivial — que `astro.config.mjs` declare
`output: 'static'` y que `package.json` tenga los cinco scripts. Es el primer test de
la suite y prueba que `bun test` funciona.

## Criterios de aceptación

- [ ] `bun run build` genera `dist/` sin errores ni warnings de TypeScript.
- [ ] `bun test` pasa.
- [ ] `bun run lint` pasa sobre el repo entero.
- [ ] La clase de Tailwind de `index.astro` aparece en el CSS de `dist/`.
- [ ] `handoff/`, `docs/` y `README.md` quedan intactos (`git diff` no los toca).
- [ ] El `.DS_Store` de la raíz ya no está trackeado.
- [ ] El workflow de Actions corre verde en la PR.

## Fuera de alcance

Tokens, fuentes, tema, contenido, i18n, componentes, motion, Playwright, Lighthouse.
Todo eso tiene su propio issue.
