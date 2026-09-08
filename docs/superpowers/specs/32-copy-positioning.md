# 32 · Copy: position as an engineer who ships, not as an orchestrator — spec

Issue: [PV3-37](https://linear.app/portfolio-djmaam-v3/issue/PV3-37) ·
Branch: `feat/32-copy-positioning` ·
Source: `handoff/content.json` (see "Editing the handoff" below)

## Why

The site sold **method**, not **result**. Five method steps, three principles, a "how I
work" section, a footer signature about agents, and an `h1` whose second line was
"Orquesto cómo se construye" — every headline surface described a process. By 2026 every
AI-forward engineer claims agent orchestration, so the claim no longer differentiates;
worse, "I orchestrate how it gets built" reads as "I do not build", which is the exact
doubt a visitor already has about an AI-first developer.

The evidence that does differentiate was on the page but buried in project cards: 12,000
farmers, US$1B+ financed, 500,000 hectares, 10,000 downloads, a review turnaround. This
spec moves the outcomes up and demotes AI from *what is sold* to *how the work is done*.

Positioning goal, in the owner's words: a developer you can trust, whose objective is
getting quality work into production.

## Decisions

### 1. The title is `AI Engineer`, not `AI Orchestrator`

`AI Orchestrator` was the `<title>`, the `og:title` and the hero eyebrow. It has no search
volume — nobody types it — and it reads as self-invented. `AI Engineer` replaces it in the
eyebrow (both languages) and as the Nera role, because it is the title actually held at
Nera. The searchable term it costs (`software engineer`) is recovered inside `heroSub`,
which is also the `meta description`: "Siete años como ingeniero de software…" /
"Seven years as a software engineer…".

Rejected: `Senior Software Engineer` (better for search, but not the real title) and
`Software Engineer & AI Engineer` (redundant).

### 2. The hero leads with production, not with orchestration

| | before | after |
|---|---|---|
| `h1b` | Orquesto cómo se construye. | Lo llevo a producción. |
| `h1b` (en) | I orchestrate how it gets built. | I ship it to production. |

`heroSub` now opens with the numbers and closes with the method, instead of the reverse.

### 3. `statCompanies` → `statProducts`

"5 empresas principales" is a fact about a résumé, not an outcome. It becomes
"10+ productos en producción": the eight products the site names (Nera, Tplay, AgroPro,
+Ushuaia, Demedis, Hashme, Creativa Media Lab, Kodai) plus the software-factory client
work at DePC and Ucosmos.

Money moved (US$1B+ financed) was rejected as a hero stat: it is the company's number, not
one a single engineer can attribute to themselves. It stays in the Nera project card,
where the subject is the product.

The old `stats.companies === content.jobs.length` guard dies with the key. Its replacement
asserts the claim is not below the projects the site can actually show, which is the way
this number can go stale.

### 4. Seven years, and the arithmetic closes

The site claimed "8+ años" / "Ocho años" while the earliest listed job starts Feb 2020 —
6.5 years at time of writing. A visitor who does that subtraction stops trusting every
other number on the page. Freelance work started in 2019 and the first team was joined in
2020, so the claim becomes `7+` / "Siete años", and `aboutBody` now names both dates so
the gap between the claim and the job list is explained rather than left to be found.

### 5. The AI claim travels with the rigor that backs it

The Nera note ended "…la plataforma actual, construida hoy principalmente con IA", which
invites the quality doubt with nothing to answer it. It now ends "Hoy la construyo con
agentes de IA, con la misma vara de review, tests y arquitectura de siempre."

### 6. `projectsSub` drops leaked placeholder text

"Las capturas se reemplazan en la implementación." / "Screenshots get replaced at
implementation." was a note to the implementer that shipped to visitors.

### 7. The footer is a signature, and both ends are the same lockup

`footerSig` becomes "Creado con ❤️ by" / "Created with ❤️ by" and the `@djmaam` handle
moves from the copyright span to the end of that line, so the signature is one phrase
instead of two halves at opposite ends. `CubeMark` moves the other way — from the
signature to in front of the name, where it already sits in `Nav.astro`. The two brand
lockups now read the same at the top and the bottom of the page.

### 8. `Spring` leaves `stack.core`, and the rows stay as they are

`stackTitle` says "Herramientas, no identidad" above 51 chips, and `USO A DIARIO` listed
Spring — not a daily driver for a TypeScript-and-agents practice, and the kind of claim
that costs credibility when asked about it.

The wider rows were **not** trimmed. `tests/stackRows.test.ts` requires each of the four
marquee rows to fall within 5% of the 1200px content column, so the chip mass is
load-bearing layout, not a list: dropping six names left a row at 1017px. Trimming the
rows is therefore a marquee change, not a copy change, and belongs to its own issue. The
candidates, if that issue is ever filed: PHP, C#, Cordova, Django, Laravel,
MySQL / MariaDB.

### 9. `Person` JSON-LD in `Base.astro`

The one thing a two-page static site can do for search that copy cannot: tie the domain,
the GitHub and the LinkedIn to one person. `jobTitle` is read from the eyebrow's first
segment rather than kept as a second copy of the string; if the ` · ` separator ever goes,
it degrades to the whole eyebrow instead of breaking.

Search positioning beyond this is a content problem, not a copy problem, and is out of
scope here: a static one-pager does not rank on phrasing.

## Editing the handoff

`CLAUDE.md` declares `handoff/` read-only. That rule was written to protect the design,
motion and architecture specs from drifting away from the source of truth, and it still
holds for them. `handoff/content.json` is different: it is the site's copy, the copy is a
product decision, and the owner made this one. The rule is narrowed rather than broken —
`content.json` may change through a spec like this one; the `*_SPEC.md` files may not.

## Acceptance criteria

- [x] No occurrence of `Orchestrator` remains in `handoff/content.json`.
- [x] `<title>` reads `Marcos Arrieta · AI Engineer · Argentina`.
- [x] `heroSub` contains "ingeniero de software" (es) and "software engineer" (en), so the
      `meta description` carries the searchable term the eyebrow dropped.
- [x] `stats.years` is `7+` and `stats.products` is `10+`; `statCompanies` is gone from
      both languages.
- [x] `aboutBody` names 2019 and 2020 in both languages.
- [x] No placeholder text ("se reemplazan en la implementación" / "get replaced at
      implementation") in the shipped copy.
- [x] The footer renders `[mark] © YYYY Marcos Arrieta` on one end and
      `Creado con ❤️ by @djmaam` plus the ASCIImoji on the other.
- [x] `Footer.astro` still contains no literal name, handle or copy — every string comes
      from `content.ts` (`tests/footer.test.ts`).
- [x] `dist/index.html` carries a valid `application/ld+json` `Person` block.
- [x] `bun run lint`, `bun test` (377) and `bun run build` pass.
