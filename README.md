# portfolio-v3

Portfolio of Marcos Arrieta · Software Engineer & AI Orchestrator · `marcosarrieta.dev`

Stack: Astro + Bun + TypeScript · Cloudflare Pages.

All the design, content, and motion specs live in [`handoff/`](./handoff/README.md).  
All technical specifications, feature blocks, and development history live in the [Documentation Map (`docs/`)](./docs/README.md).

## Quick Start

```bash
bun install
bun run dev      # Local dev server
bun run build    # Static production build
bun test         # Run unit tests
bun run lint     # ESLint + Prettier + token checks
```

## Documentation & Knowledge Graphs

- **[Documentation Map (`docs/README.md`)](./docs/README.md)**: Master index of all 24 specifications categorized by phase, cross-referencing initial and refinement iterations.
- **[Design Handoff (`handoff/`)](./handoff/README.md)**: Read-only design tokens, bilingual copy (`content.json`), motion timelines, and interactive reference mocks.
- **Architecture Knowledge Graph (`docs/architecture/`)**: an Obsidian vault of the import graph, plus a visual canvas and `graphify-out/graph.html`. **Generated, not versioned** — it is derived from `src/`, so it is git-ignored like `.codegraph/` and rebuilt on demand:

  ```
  graphify ./src --obsidian --obsidian-dir ./docs/architecture
  ```

- **CodeGraph (`.codegraph/`)**: SQLite symbol index for instant AST lookups, callers, and blast radius analysis. Also generated and git-ignored.

## Working with Claude Code

When continuing development or kicking off a new block:

1. Read `CLAUDE.md` and consult [`docs/README.md`](./docs/README.md) for existing specifications and component lineage.
2. Use `codegraph_explore` (MCP) first to inspect relevant symbols, call paths, and blast radius before touching code.
3. Follow the project workflow: write and commit the spec under `docs/superpowers/specs/NN-<block>.md` before implementing the code.
