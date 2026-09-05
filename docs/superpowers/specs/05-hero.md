# 05 · Hero — spec

Issue: [PV3-10](https://linear.app/portfolio-djmaam-v3/issue/PV3-10) · Branch: `feat/05-hero`
Design: `handoff/DESIGN_SPEC.md` §3.2 · `handoff/MOTION_SPEC.md` §2 · `docs/superpowers/specs/2026-09-05-portfolio-v3-design.md` §6

## Goal

The left column of the hero and the boot sequence that reveals it. The right column —
the console — is issue 06 and stays empty here; the grid already accounts for it.

## Context

`Base.astro` renders `Nav` in its `nav` slot and a scaffold content block in the default
slot. That scaffold block is replaced by the hero.

Available: `content.ts`, `ui.ts`, `theme.ts`, `motion/{math,scroll,scramble,reduced}.ts`.

Hero copy keys: `eyebrow`, `h1a`, `h1b`, `heroSub`, `ctaWork`, `ctaContact`,
`statYears`, `statCompanies`, `statPlatforms`.

## Scope

### 0. Refactor first: shared anchor handling

Nav currently owns the smooth-scroll click handler in its own script. The hero's CTAs
need the same behavior, so **extract it before adding the hero**:

`src/lib/motion/anchors.ts` — binds one delegated `click` listener on `document` for
`[data-nav-link]`, applying the `--nav-h` offset, the `#top` special case, the
missing-target no-op, and the `reduce` guard. Called once from `Base.astro`.

Nav keeps `data-nav-link` on its links and loses its handler. The hero's CTAs get the
same attribute. One handler, one behavior, no duplication — this is why it moves rather
than getting copied.

### 1. `src/components/Hero.astro`

Props: `lang: Lang`.

Grid: `repeat(auto-fit, minmax(min(100%, 380px), 1fr))`. One column below that width,
console under the text.

Padding: `clamp(72px, 10vw, 140px)` top, `clamp(64px, 8vw, 110px)` bottom. This appears
once in the site, so it stays local — not a utility.

Left column, in order:

1. **Eyebrow** — mono, `--text-label`, typed character by character with a permanent
   blinking cursor (7×12px, `blink 1s steps(1) infinite`).
2. **H1** — two lines: `h1a`, then `h1b` in `--color-accent` with
   `text-shadow: 0 0 40px` accent at .3–.45 alpha. `text-wrap: balance`, `--text-h1`.
3. **Sub** — `heroSub`, `--text-hero-sub`, `--color-dim`.
4. **CTAs** — primary filled with `--color-ink` (label `ctaWork` → `#work`), secondary
   outlined (label `ctaContact` → `#contact`). Pills, `border-radius: 999px`. Both carry
   `data-nav-link`. Hover: primary `translateY(-1px)`, secondary border → accent.
5. **Stats** — three mono items, each a bold number plus its label.

### 2. Stat numbers

`8+`, `5` and `6` are hardcoded in the mock and **absent from `content.json`**, which is
read-only. They are language-independent facts, so they go in `src/lib/ui.ts` next to the
existing chrome copy:

```ts
export const stats = { years: '8+', companies: '5', platforms: '6' } as const
```

`companies` must always equal the number of entries in `jobs`. A unit test asserts
`stats.companies === String(content.es.jobs.length)`, so adding a company to
`content.json` fails the suite instead of silently making the hero lie.

`years` and `platforms` are editorial and have no derivable source — leave them literal.

### 3. Boot sequence — `src/lib/motion/boot.ts`

Elements carry `data-boot="n"`. Initial state (only under `html.has-js`):
`opacity: 0; transform: translateY(14px); filter: blur(8px)`.
Transition 900ms `cubic-bezier(.2,.8,.2,1)`.

Revealed at `bootDelay(n) = 500 + n * 170` ms:

| n | element |
|---|---|
| 0 | eyebrow |
| 1 | H1 |
| 2 | sub |
| 3 | CTAs |
| 4 | stats |

`bootDelay` goes in `math.ts` and is unit-tested, including `bootDelay(10) === 2200` —
the console's slot, which issue 06 uses.

`boot.ts` queries `[data-boot]`, sorts by `n`, and schedules each. Under `reduce` it
applies the final state immediately with no transition.

### 4. Eyebrow typing

Pure function in `math.ts`:

```ts
typedLength(elapsed: number, perChar: number, total: number): number
```

Returns how many characters are visible after `elapsed` ms — `clamp(floor(elapsed / perChar), 0, total)`.

The driver starts at 700ms and advances at 28ms per character, rAF-based, not
`setInterval` — the interval in the mock drifts, and a frame-timed loop stays in step
with the boot transitions.

The cursor is a separate element that blinks forever, independent of typing progress.
Under `reduce`, the eyebrow renders complete and the cursor does not blink.

### 5. Section id

The hero is the landing block; `#top` already resolves natively. No id needed here.

## Acceptance criteria

- [ ] `bun test`: `bootDelay(n)` returns `500 + n·170` for n ∈ [0..4] and 2200 for n=10.
- [ ] `bun test`: `typedLength` returns 0 before the first character, clamps at `total`, and advances one character per `perChar` ms.
- [ ] `bun test`: `stats.companies === String(content.es.jobs.length)` — and the same for `en`.
- [ ] `bun test`: `anchorOffset` behavior is unchanged after the move to `anchors.ts` (the existing tests keep passing).
- [ ] All hero copy comes from `content.json`; the stat numbers from `ui.ts`. No literal copy in the component.
- [ ] Exactly one delegated anchor click handler in the shipped JavaScript — Nav no longer has its own.
- [ ] Still exactly one scroll listener call site.
- [ ] With JavaScript disabled: the whole hero is visible and legible, eyebrow included, at full opacity.
- [ ] With `reduce`: everything visible on the first frame, no typing, no blinking cursor.
- [ ] The CTAs scroll smoothly to their sections once those exist, and no-op silently until then.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.

## Out of scope

The console and its log (issue 06), the node canvas (07), and every section below the
hero. The right grid column stays empty.
