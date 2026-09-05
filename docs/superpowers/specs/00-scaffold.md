# 00 · Scaffold — spec

Issue: [PV3-5](https://linear.app/portfolio-djmaam-v3/issue/PV3-5) · Branch: `feat/00-scaffold`
Design: `docs/superpowers/specs/2026-09-05-portfolio-v3-design.md` §2, §3, §9

## Goal

Leave the repo ready so that any later issue only adds components and styles. No
content, design or motion in this block.

## Context

The repo today has `handoff/` (design source of truth, **not to be touched**), `docs/`
and `README.md`. Bun 1.4.0 installed. Branch `main`, clean.

## Scope

### 1. Astro project

`bunx create-astro@latest . --template minimal --typescript strict --no-install --no-git --skip-houston --yes`
over the existing directory, taking care not to overwrite `handoff/`, `docs/`, `README.md`
or `.git`. Then `bun install`.

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

`tsconfig.json`: extends `astro/tsconfigs/strict`. Alias `@/*` → `src/*`.

### 2. Tailwind v4

`@tailwindcss/vite` (not the PostCSS plugin, not `astro add tailwind`).
`src/styles/app.css` with **only** `@import "tailwindcss";` — the tokens belong to
issue 01. Imported from a page so it makes it into the build.

### 3. Structure

Create the directories from spec §3 that are going to exist no matter what. The empty
ones carry a `.gitkeep`:

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

`src/pages/index.astro` is a minimal placeholder with one Tailwind class applied,
enough to prove the pipeline works. Issue 02 replaces it.

### 4. Tooling

- **Prettier** with `prettier-plugin-astro`. Config in `.prettierrc`.
- **ESLint** flat config (`eslint.config.js`) with `typescript-eslint` +
  `eslint-plugin-astro`. No custom rules beyond the recommended ones.
- Scripts in `package.json`:
  - `dev`, `build`, `preview` (Astro)
  - `lint` → `eslint . && prettier --check .`
  - `format` → `prettier --write .`
  - `test` → `bun test`
- `.gitignore`: `node_modules`, `dist`, `.astro`, `.DS_Store`, `.env*`.
- **Delete the `.DS_Store` that is committed at the root.**

### 5. CI

`.github/workflows/ci.yml`, on `push` to `main` and on `pull_request`:
`oven-sh/setup-bun` → `bun install --frozen-lockfile` → `bun run lint` →
`bun test` → `bun run build`.

### 6. Test

`tests/scaffold.test.ts`: a real test, not a trivial one — that `astro.config.mjs`
declares `output: 'static'` and that `package.json` has the five scripts. It is the
first test of the suite and proves that `bun test` works.

## Acceptance criteria

- [ ] `bun run build` generates `dist/` with no TypeScript errors or warnings.
- [ ] `bun test` passes.
- [ ] `bun run lint` passes over the whole repo.
- [ ] The Tailwind class from `index.astro` shows up in the CSS in `dist/`.
- [ ] `handoff/`, `docs/` and `README.md` are left intact (`git diff` does not touch them).
- [ ] The root `.DS_Store` is no longer tracked.
- [ ] The Actions workflow runs green on the PR.

## Out of scope

Tokens, fonts, theme, content, i18n, components, motion, Playwright, Lighthouse.
All of that has its own issue.
