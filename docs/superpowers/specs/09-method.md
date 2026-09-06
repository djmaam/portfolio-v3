# 09 · How I work — spec

Issue: [PV3-14](https://linear.app/portfolio-djmaam-v3/issue/PV3-14) · Branch: `feat/09-method`
Design: `handoff/DESIGN_SPEC.md` §3.4 · `handoff/MOTION_SPEC.md` §7 · `handoff/README.md` rule 6

## Goal

The last section, and the one with the most state logic in the site: a pinned block whose
five cards light up in sequence as the page scrolls past it.

## Context

Every other section is merged. Both pages still carry the `method` markers — the only
pair left. The section lands between About and Experience, which is where the markers
already sit.

Reuse, do not reimplement: `onScroll` (`scroll.ts`), `bindReveals` (`reveal.ts`),
`prefersReducedMotion` (`reduced.ts`).

Content: `secMethod`, `methodTitle`, `methodSub`, `cycleIdle`, `cycleDone`,
`stepVerbs` (a **pipe-separated string** of 5 verbs, not an array), `steps`
(5 × `{n, color, h, d, tool}`).

## Scope

### 1. Colors come from tokens, never from the JSON

`steps[].color` holds the five traffic-light hexes. Unlike the experience `dot`/`glow`
trap, these *are* real design colors — and they already exist as `--color-step-1`
through `--color-step-5`, added in issue 01. Map step index → token. Do not emit the
literal, and do not add new tokens.

### 2. `src/components/Method.astro`

Props: `lang: Lang`. Section `id="method"`.

Header: mono `02 / CÓMO TRABAJO` + `methodTitle` + `methodSub`, plus the status indicator
(a dot and a mono line) on the right.

Five cards in a grid `repeat(auto-fit, minmax(min(100%, 150px), 1fr))` — five across from
about 850px. Each card: `n`, a dot, `h`, `d`, and `tool` at the foot behind a
`border-top: 1px dashed`.

### 3. The pinned track

Desktop, **and only when both** the viewport is at least 720px wide **and** the block fits
in the viewport height: the section gets a 280vh track containing a
`position: sticky; top: 0; min-height: 100vh` block, vertically centered, 32px padding.

Progress: `p = -track.top / (track.height - vh)`.

Mobile or a block that does not fit: no sticky at all,
`p = (.85·vh - top) / (.9·height)`, same step logic.

The fit test runs on resize (through the existing `onScroll` tick — **no new listener**)
and toggles a class, so rotating a phone does not strand the section half-pinned.

### 4. Step state — pure math

```ts
methodStep(p: number): { active: number; done: boolean }
// active = p < .06 ? -1 : Math.min(4, Math.floor((p - .06) / .84 * 5))
// done   = p >= .93
methodProgress(top: number, height: number, vh: number, pinned: boolean): number
```

Both in `math.ts`, unit-tested. `MOTION_SPEC` §7 exactly.

Card states:

| state | style |
|---|---|
| upcoming | `opacity: .22; transform: translateY(10px) scale(.97)`, `--color-line` border |
| active | `translateY(-6px) scale(1.03)`, border and `0 0 0 1px` ring in its own step color, `0 20px 60px` shadow |
| completed | normal, dot lit in its step color at `scale(1.25)` with a `0 0 12px` glow |
| done (all) | accent border at .65, `--color-accent-soft` background, `0 0 44px` accent glow, accent dots |

Transitions 600ms `cubic-bezier(.2,.8,.2,1)`, and **reversible**: scrolling back up walks
the states backwards. The state is a pure function of `p`, so this falls out for free —
do not accumulate state across frames.

### 5. Status indicator

`cycleIdle` → `${verb} · ${n}/5` for each of the five verbs → `cycleDone`.

The verbs come from `stepVerbs.split('|')`, which must yield exactly 5. Assert it: a
missing pipe would silently shift every label by one.

The dot and the text take the active step's color; at `done` they take the accent.

### 6. Reduced motion and no JS

With `reduce`: no track, no sticky, no pinning. The five cards render in their normal
state, fully legible, and the indicator shows `cycleIdle`.

With JavaScript disabled: identical. The `.22` opacity of the upcoming state must live
behind `.has-js`, like every other resting state in `app.css`.

## Acceptance criteria

- [ ] `bun test`: `methodStep(p)` gives `active === -1` below .06, walks 0→4 across the specified bands, and `done` from .93.
- [ ] `bun test`: `methodStep` is a pure function of `p` — the same `p` yields the same state regardless of call order, which is what makes it reversible.
- [ ] `bun test`: `methodProgress` matches the pinned and the fallback formulas.
- [ ] `bun test`: `stepVerbs.split('|')` has exactly 5 entries in both languages.
- [ ] `bun test`: the indicator text for each active step matches the verb at that index, in both languages.
- [ ] No hex from `steps[].color` appears in the built HTML or CSS; the five `--color-step-*` tokens are used instead.
- [ ] Below 720px there is no `position: sticky` and no 280vh track.
- [ ] With `reduce` and with JavaScript disabled, all five cards are legible at full opacity.
- [ ] Still exactly one scroll listener call site, and the section adds no `resize` listener.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.

## Out of scope

Focus rings and the a11y pass (issue 16). The nav has no `#method` link and does not gain
one here.
