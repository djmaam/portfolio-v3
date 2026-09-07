# 28 · Documentation map, Obsidian architecture vault and CodeGraph indexing — spec

Issue: [PV3-33](https://linear.app/portfolio-djmaam-v3/issue/PV3-33) · Branch: `feat/28-docs-and-knowledge-graphs`
Design: `docs/superpowers/specs/2026-09-05-portfolio-v3-design.md` · `docs/README.md`

## Goal

Establish a centralized documentation map, an Obsidian-ready architecture knowledge graph with an interactive canvas, and a CodeGraph AST symbol index to streamline developer onboarding and multi-agent navigation.

## Context

The repository contains 24 implementation specifications, a Spanish design handoff package, and 29 code components/modules. Previously, there was no central table of contents linking these specifications by delivery phase, no cross-references indicating which specs were refined by subsequent iterations, and no persistent AST symbol graph for instant blast-radius calculation.

## Scope

### 1. Central Documentation Map (`docs/README.md`)

- Group all specifications into logical phases:
  1. Foundation & Scaffold (00–03)
  2. Core Sections (04–14)
  3. Quality, A11y & E2E Validation (16–17)
  4. Containerization & Mock Parity Polish (19–27)
  5. Architecture & Knowledge Graphs (28)
- Provide an interactive Mermaid diagram illustrating the documentation hierarchy (`handoff/` → `Master Spec` → `Feature Specs` → `Code/Tests`).
- Document the reason behind numbering gaps (15, 18, 21, 25, 26).
- Link directly to the newly generated `docs/architecture/` Obsidian vault and canvas.

### 2. Bidirectional Evolution Links

Add callout notes (`> [!NOTE]`) linking both forward and backward across all 5 refined specification pairs:
- `04-nav.md` ↔ `20-nav-align.md`
- `05-hero.md` ↔ `27-hero.md`
- `10-experience.md` ↔ `23-experience.md`
- `11-projects.md` ↔ `24-projects.md`
- `12-stack.md` ↔ `22-stack.md`

### 3. Architecture Knowledge Graph (`docs/architecture/`)

- Execute `graphify ./src --obsidian --obsidian-dir ./docs/architecture` to generate 175 AST markdown notes mapping every Astro component, utility function, and type.
- Generate `docs/architecture/graph.canvas` for visual canvas exploration.
- Generate `graphify-out/graph.html` for zero-install 3D browser viewing.

### 4. CodeGraph Indexing (`.codegraph/`)

- Run `codegraph init` on the repository, indexing 68 files, 799 nodes, and 2,254 edges in SQLite.
- Enable instant symbol lookup, callers/callees tracing, and blast radius calculation via `codegraph_explore`.

### 5. Git Hygiene & Agent Instructions

- Add `.obsidian/`, `graphify-out/`, and `.codegraph/` to `.gitignore`.
- Update `CLAUDE.md` and `README.md` to reference `docs/README.md`, `docs/architecture/`, and instruct agents to invoke `codegraph_explore` before modifying code.

## Verification

- `bun test`: All 326 tests pass with 0 failures.
- `docs/README.md`: All relative links resolve without 404s.
- `git status`: Local SQLite databases and IDE cache files remain strictly gitignored.
