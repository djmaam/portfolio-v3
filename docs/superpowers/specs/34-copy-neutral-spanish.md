# 34 · Copy: neutral Spanish, no Rioplatense idioms — spec

Issue: [PV3-39](https://linear.app/portfolio-djmaam-v3/issue/PV3-39) ·
Branch: `fix/34-copy-neutral-spanish`
Source: `handoff/content.json` — copy edits follow the rule narrowed in
[`32-copy-positioning.md`](./32-copy-positioning.md) ("Editing the handoff").

## Why

The site is written for a Latin American and international audience, but two strings in
the Spanish copy were Rioplatense: they mark the writer as Argentine before the content
does. The eyebrow already says `AI Engineer · Argentina`; the origin is stated on purpose
in one place and does not need to leak into the register of every sentence.

Neutral here means "reads as natural in any Spanish-speaking market": tuteo instead of
voseo, and verbs that do not depend on a local idiom to parse.

## Changes

| Key | Before | After | Marker |
| --- | --- | --- | --- |
| `i18n.es.contactTitle` | Si **tenés** algo que construir, hablemos. | **¿Tienes** algo que construir? Hablemos. | voseo |
| `i18n.es.jobs[1].note` | …un rediseño técnico y visual completo que **dio vuelta** las reseñas… | …que **revirtió** las reseñas… | Rioplatense idiom |
| `i18n.en.contactTitle` | If you have something to build, let's talk. | Got something to build? Let's talk. | parity with the new question rhythm in `es` |

## Out of scope

Reviewed and deliberately left alone, because none of them is Argentine:

- `stepVerbs` (`CODEANDO|DEPLOYANDO`) — dev spanglish, used across LatAm, and the whole
  cycle is written in that register.
- `jobs[0].note`, "la misma **vara** de review" — "subir la vara" is pan-Hispanic.
- `heroSub`, "arquitectura que **aguanta**" — informal but neutral.
- `footerSig`, "Creado con ❤️ by" — the mixed-language signature is fixed by
  [`32-copy-positioning.md`](./32-copy-positioning.md).

`src/` holds no Spanish literals: every string still comes from `content.json` through
`src/lib/content.ts`, so this block touches copy only, no components and no tests.

## Acceptance criteria

- [x] No voseo form (`tenés`, `podés`, `querés`, `sabés`, `hacés`, `sos`) remains in
      `handoff/content.json`.
- [x] "dio vuelta" no longer appears in the Spanish copy.
- [x] `i18n.es` and `i18n.en` keep identical key sets, and both `contactTitle` values are
      questions.
- [x] `bun run lint`, `bun test` and `bun run build` pass.
