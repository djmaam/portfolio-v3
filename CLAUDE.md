# portfolio-v3

Personal site of Marcos Arrieta (`marcosarrieta.dev`). Astro 7 (static) + Bun +
TypeScript strict + Tailwind v4. No UI framework.

## Language

**Everything is written in American English** — code comments, identifiers, commit
messages, script output, test names, `README.md`, `CLAUDE.md` and the specs under
`docs/superpowers/specs/`. This applies to code written by subagents too. Watch the
easy slips: `color` not `colour`, `math` not `maths`, `behavior` not `behaviour`,
`normalize` not `normalise`.

The only exception is `handoff/`, which stays in Spanish on purpose: it is the
read-only design source of truth, and `handoff/content.json` holds the site copy in
Spanish and English (that is product content, not code).

## Sources of truth

- `handoff/` — design, motion and content specs. The `*_SPEC.md` files are
  **read-only** — never edit. `handoff/content.json` is the site copy, and copy is a
  product decision: it changes only through a spec, and only when Marcos asks
  (see `docs/superpowers/specs/32-copy-positioning.md`).
- `docs/README.md` — central documentation map and spec index across all phases.
- `docs/superpowers/specs/2026-09-05-portfolio-v3-design.md` — technical design.
- `docs/superpowers/specs/NN-<block>.md` — one spec per Linear issue, written before
  the code.
- `docs/architecture/` — AST-derived architecture knowledge graph and Obsidian canvas (`graph.canvas`).

## Exploration & AST Graph

- **CodeGraph is enabled (`.codegraph/`)**: Call `codegraph_explore` FIRST for inspecting symbols, callers, and blast radius before modifying any code. It replaces multi-turn grep/read loops with a single call.
- **Graphify / Architecture Knowledge Graph**: `docs/architecture/` (and `graphify-out/graph.html`). **Generated and git-ignored** — it is a cache of the import graph, not a source of truth, and a fresh clone will not have it. Rebuild with `graphify ./src --obsidian --obsidian-dir ./docs/architecture` after adding components or changing the architecture. The sources of truth stay the two named above: `handoff/` and the specs.

## Conventions

- **No literal colors outside `src/styles/app.css`.** Components consume `@theme`
  tokens only; `bun run lint` fails otherwise (`scripts/check-tokens.ts`).
- **No hardcoded copy.** Every string comes from `handoff/content.json` through
  `src/lib/content.ts`.
- **Motion math lives in pure functions** (`src/lib/motion/math.ts`) so `bun test`
  covers it without a DOM. Only DOM plumbing is left untested by unit tests.
- **One scroll listener** for the whole site, rAF-throttled, in
  `src/lib/motion/scroll.ts`.
- Every animation sits behind `prefers-reduced-motion: no-preference`; with `reduce`
  the content is visible from the first frame.
- Initial `opacity: 0` states apply only under `html.has-js` — the site must be
  readable with JavaScript disabled.

## Commands

```
bun run dev      # dev server
bun run build    # static build to dist/
bun run lint     # eslint + prettier + check-tokens
bun test         # unit tests
```

## Workflow

One Linear issue (team `PV3`) = one block = one branch `feat/NN-<block>` = one PR.
The spec is written and committed before the code. Acceptance criteria in the spec are
the tests.
