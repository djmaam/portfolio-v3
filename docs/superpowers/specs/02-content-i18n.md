# 02 · content.ts + i18n — spec

Issue: [PV3-7](https://linear.app/portfolio-djmaam-v3/issue/PV3-7) · Branch: `feat/02-content-i18n`
Design: `docs/superpowers/specs/2026-09-05-portfolio-v3-design.md` §5 · `handoff/README.md` (rules 1 and 2)

## Goal

A single typed content source and both language routes. After this block, no component
ever writes a literal string: they all read `t = content[lang]`.

## Context

`src/pages/index.astro` is currently a token test bench with hardcoded Spanish copy. It
gets replaced here. `src/lib/theme.ts` already exists; the visible theme toggle is
issue 04.

`handoff/content.json` is read-only and shaped like this:

```
{
  "i18n": { "es": { …41 keys… }, "en": { …41 keys… } },
  "consoleLog": [ [key, value] × 11 ],
  "stack": …,
  "links": { email, github, linkedin, telegram, domain }
}
```

Inside `i18n.<lang>`: `jobs` (5), `projects` (6), `steps`, `principles`, `stepVerbs`,
plus scalar copy (`h1a`, `heroSub`, `navAbout`, …).

## Scope

### 1. `src/lib/content.ts`

```ts
import raw from '../../handoff/content.json'

export type Lang = 'es' | 'en'
export type Content = (typeof raw)['i18n']['es']

export const content: Record<Lang, Content> = raw.i18n
export const { links, stack, consoleLog } = raw
export const LANGS = ['es', 'en'] as const
```

Types are **derived from the JSON**, never hand-written — a new key in
`content.json` must not need a type edit. If `resolveJsonModule` is not already on in
`tsconfig.json`, turn it on.

The import crosses out of `src/`. That is deliberate: `handoff/` is the source of
truth and must not be duplicated. Verify the build inlines it and that `dist/` ships
no JSON file of its own.

### 2. `src/lib/i18n.ts`

```ts
export const DEFAULT_LANG: Lang = 'es'

langFromPath(pathname: string): Lang        // '/en' or '/en/…' → 'en', else 'es'
siblingPath(pathname: string, to: Lang): string  // '/' ⇄ '/en'
```

Both are pure functions and get unit tests. They must handle the trailing slash
(`/en/` and `/en`) and an unknown path (falls back to `DEFAULT_LANG`).

### 3. Routes

- `src/pages/index.astro` — `lang = 'es'`
- `src/pages/en/index.astro` — `lang = 'en'`

Both render the same markup from `t = content[lang]`; the only difference is the
language. Since no components exist yet, each page renders a minimal block that proves
the wiring: `h1a` + `h1b`, `heroSub`, and the list of `jobs[].company`. Issues 03–14
replace this markup.

`<html lang={lang}>`. In `<head>`, both pages carry:

```html
<link rel="alternate" hreflang="es" href="https://marcosarrieta.dev/" />
<link rel="alternate" hreflang="en" href="https://marcosarrieta.dev/en" />
<link rel="alternate" hreflang="x-default" href="https://marcosarrieta.dev/" />
```

The inline theme script and the two font preloads from issue 01 move into both pages
verbatim. Issue 03 hoists all of it into `Base.astro`.

### 4. Language toggle

A real `<a href={siblingPath(pathname, other)}>` — it works with JavaScript disabled.
On click it writes `localStorage.lang` before navigating.

### 5. First-load redirect

On load, if `localStorage.lang` exists and disagrees with the route's language,
redirect once to the sibling route.

The loop guard is a `sessionStorage` flag, not a counter: the redirect may fire at
most once per session.

```js
const stored = localStorage.getItem('lang')
const current = langFromPath(location.pathname)
if (stored && stored !== current && !sessionStorage.getItem('langRedirected')) {
  sessionStorage.setItem('langRedirected', '1')
  location.replace(siblingPath(location.pathname, stored))
}
```

`location.replace`, not `location.href` — the wrong-language page must not end up in
the back-button history. Clicking the toggle writes `localStorage.lang` first, so the
redirect never fights an explicit choice.

Runs in the same inline script as the theme, before first paint, to avoid a flash of
the wrong language.

### 6. Delete

The Spanish copy hardcoded in the token test bench (`Latin subset: ñ á é…`,
`Surface on --color-surface`, the traffic-light dots). Tokens are covered by
`tests/tokens.test.ts`; the bench has done its job.

## Acceptance criteria

- [ ] `bun test`: `content.es` and `content.en` have identical key sets, compared recursively (not just top level).
- [ ] `bun test`: `jobs`, `projects`, `steps`, `principles` and `stepVerbs` have the same length in both languages.
- [ ] `bun test`: no content string is empty or whitespace-only, in either language.
- [ ] `bun test`: `langFromPath` resolves `/`, `/en`, `/en/`, and an unknown path.
- [ ] `bun test`: `siblingPath` round-trips — `siblingPath(siblingPath(p, other), original) === p` for both routes.
- [ ] `bun test`: `Content` is derived from the JSON — adding a key to `content.json` does not require editing a type (assert the type is `typeof raw['i18n']['es']`, e.g. with a compile-time check).
- [ ] `dist/` contains `index.html` and `en/index.html`, each with the right `<html lang>` and the three `hreflang` links.
- [ ] The toggle navigates between `/` and `/en` with JavaScript disabled.
- [ ] With `localStorage.lang = 'en'`, opening `/` lands on `/en` once, and going back does not bounce again.
- [ ] Clicking the toggle to a language that disagrees with `localStorage` wins: no redirect back.
- [ ] `grep` finds no hardcoded site copy in `src/` — every string comes from `content.ts`.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.

## Out of scope

Nav, layout, components, motion, the visible theme toggle. The markup rendered here is
scaffolding that issues 03–14 replace.
