# portfolio-v3

Portfolio of Marcos Arrieta · Software Engineer & AI Orchestrator · [`marcosarrieta.dev`](https://marcosarrieta.dev)

Astro 7 (static) + Bun + TypeScript strict + Tailwind v4. No UI framework, no client-side
router: the whole site is two prerendered pages (`/` in Spanish, `/en` in English) plus a
handful of vanilla TypeScript modules for motion. Deployed to Cloudflare Pages.

All design, content, and motion specs live in [`handoff/`](./handoff/README.md).
All technical specifications, feature blocks, and development history live in the
[Documentation Map (`docs/`)](./docs/README.md).

## Quick Start

```bash
bun install
bun run dev        # Local dev server
bun run build      # Static production build to dist/
bun run preview    # Serve the built dist/ locally
```

## Checks

```bash
bun run lint       # ESLint + Prettier + tsc --noEmit + design-token check
bun run format     # Prettier --write
bun test           # 379 unit tests across 27 files (Bun, no DOM)
bun run test:e2e   # Playwright suite in e2e/ (needs a build first)
bun run test:lh    # Lighthouse CI against dist/
```

`bun run lint` ends with [`scripts/check-tokens.ts`](./scripts/check-tokens.ts), which fails
the build on any literal color outside `src/styles/app.css` — components consume `@theme`
tokens only.

CI ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs two parallel jobs:
`check` (lint + unit tests + build) and `browser` (build once, then Playwright and
Lighthouse over the same `dist/`, on a pinned Chromium).

## Layout

```
src/
  pages/          index.astro (ES) · en/index.astro · robots.txt.ts · sitemap.xml.ts
  layouts/        Base.astro — head, metadata, theme-flash script, font preloads, favicons
  components/     One .astro per section (Hero, Console, About, Method, …) + CubeMark
  lib/            content.ts (typed copy loader), i18n, theme, ui, projects, stack
  lib/motion/     Pure math (math.ts, mark.ts, network.ts…) + DOM plumbing, one scroll listener
  styles/app.css  The only file allowed to hold literal colors
handoff/          Read-only design source of truth + content.json (ES/EN copy)
docs/             Documentation map and one spec per block
scripts/          Build-time generators: favicon, OG image, logo masks, previews
tests/            Unit tests (bun test)
e2e/              Playwright specs
```

## Conventions

- **No literal colors outside `src/styles/app.css`** — enforced by `bun run lint`.
- **No hardcoded copy** — every string comes from `handoff/content.json` via `src/lib/content.ts`.
- **Motion math is pure** (`src/lib/motion/math.ts` and friends) so `bun test` covers it without a DOM.
- **One rAF-throttled scroll listener** for the whole site (`src/lib/motion/scroll.ts`).
- Every animation sits behind `prefers-reduced-motion: no-preference`; initial `opacity: 0`
  states apply only under `html.has-js`, so the site stays readable with JavaScript disabled.
- Everything is written in American English, except `handoff/`, which is Spanish on purpose.

## Documentation & Knowledge Graphs

- **[Documentation Map (`docs/README.md`)](./docs/README.md)**: master index of the 31 block
  specifications by phase, cross-referencing initial and refinement iterations.
- **[Design Handoff (`handoff/`)](./handoff/README.md)**: read-only design tokens, bilingual
  copy (`content.json`), motion timelines, and interactive reference mocks.
- **Architecture Knowledge Graph (`docs/architecture/`)**: an Obsidian vault of the import
  graph, plus a visual canvas and `graphify-out/graph.html`. **Generated, not versioned** —
  derived from `src/`, git-ignored like `.codegraph/`, rebuilt on demand:

  ```
  graphify ./src --obsidian --obsidian-dir ./docs/architecture
  ```

- **CodeGraph (`.codegraph/`)**: SQLite symbol index for instant AST lookups, callers, and
  blast radius analysis. Also generated and git-ignored.

## Working with Claude Code

When continuing development or kicking off a new block:

1. Read `CLAUDE.md` and consult [`docs/README.md`](./docs/README.md) for existing specifications and component lineage.
2. Use `codegraph_explore` (MCP) first to inspect relevant symbols, call paths, and blast radius before touching code.
3. Follow the project workflow: one Linear issue (team `PV3`) = one block = one branch
   `feat/NN-<block>` = one PR, with the spec written and committed under
   `docs/superpowers/specs/NN-<block>.md` before the code.
