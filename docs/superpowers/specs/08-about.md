# 08 · About — spec

Issue: [PV3-13](https://linear.app/portfolio-djmaam-v3/issue/PV3-13) · Branch: `feat/08-about`
Design: `handoff/DESIGN_SPEC.md` §3.3 · `handoff/MOTION_SPEC.md` §5, §6

## Goal

The first section below the hero, and the generic reveal observer that issues 10 to 13
all consume. That shared module is the more important half of this block.

## Context

`Base.astro` renders `Nav` and the page content. The hero is the only section so far.

`onScroll` (`scroll.ts`) already delivers `{ scrollY, vh, progress }` once per frame to
any subscriber. About's word illumination hooks onto it — **it must not add a listener**.

Content keys: `secAbout`, `aboutLead`, `aboutBody`, `principles` (3 items, each
`{ n, h, d }`).

## Scope

### 1. `src/lib/motion/reveal.ts` — shared, used by 10-13

An `IntersectionObserver` that reveals `[data-reveal]` elements once:

- Initial state (only under `html.has-js` and `no-preference`):
  `opacity: 0; transform: translateY(18px); filter: blur(6px)`.
- Transition 800ms `cubic-bezier(.2,.8,.2,1)`.
- Observer: `threshold: .15`, `rootMargin: '0px 0px -8% 0px'`, unobserve after firing.
- `data-delay` in ms staggers the transition.

```ts
export function bindReveals(root?: ParentNode): () => void
```

Called once from `Base.astro`, like `bindAnchors`. Under `reduce` it returns a no-op and
never constructs the observer.

**Rule from `MOTION_SPEC` §5, and it matters:** `data-reveal` goes on a *wrapper*, never
on the element that also has a hover `transform`. Two transforms on one element fight.
Enforce it in review, and follow it in the markup here.

The resting-state CSS lives in `app.css` next to the `[data-boot]` rule, for the same
reason: it is shared, and cascade order against a scoped style should not be
load-bearing.

### 2. `src/components/About.astro`

Props: `lang: Lang`. Section `id="about"` — the nav link finally resolves.

Layout: mono label `01 / SOBRE MÍ` on the left, content on the right at roughly 2/3.
Uses `container-page`, `section-y` and `section-divider`.

1. **Lead** — `aboutLead` at `--text-lead`, split into words:
   `display: flex; flex-wrap: wrap; gap: 0 .26em`. Each word starts at `opacity: .16`
   with a 350ms transition.
2. **Body** — `aboutBody` at `--text-body`, `--color-dim`. Wrapped in `[data-reveal]`.
3. **Principles** — three cards from `principles`, grid
   `repeat(auto-fit, minmax(min(100%, 200px), 1fr))`. Each: `n` in mono accent, `h` as
   the card title, `d` as body. Staggered `data-delay` of `110 · i`.
   Hover: `translateY(-4px)`, border to accent, shadow — so the reveal wrapper is the
   `<li>` and the transform lives on the inner card.

### 3. Word illumination — pure math

```ts
aboutProgress(top: number, vh: number): number   // clamp((.8·vh - top) / (.45·vh), 0, 1)
wordOpacity(index: number, total: number, p: number): number  // clamp(p·(total+3) - index, .16, 1)
```

Both in `math.ts`, unit-tested. `MOTION_SPEC` §6 exactly.

The driver subscribes to `onScroll`, reads the lead's `top` from a rect cached per
resize, and writes `style.opacity` on each word span. Under `reduce`, every word renders
at opacity 1 and nothing subscribes.

### 4. Splitting words without breaking selection

The lead is split into `<span>` per word at build time, not at runtime — server-rendered
so it is correct with no JavaScript. Preserve the spaces as real gaps (`gap: 0 .26em`),
so copying the text still yields the sentence with spaces.

## Acceptance criteria

- [ ] `bun test`: `wordOpacity` returns .16 at p=0, reaches 1 for word 0 once p·(n+3) ≥ 1, respects the `+3` lead-in, and clamps at both ends.
- [ ] `bun test`: `aboutProgress` is 0 below the trigger, 1 past it, and clamps.
- [ ] `bun test`: `revealDelay(i) === 110 · i`.
- [ ] `bun test`: `bindReveals` returns a no-op under `reduce` and constructs no observer.
- [ ] `bun test`: reveal unobserves after the first intersection — an element never fires twice.
- [ ] The lead ships word-split in the HTML; with JavaScript disabled every word is at full opacity and the sentence copies with its spaces.
- [ ] No `[data-reveal]` element also carries a hover `transform`.
- [ ] Still exactly one scroll listener call site; About adds none.
- [ ] The `#about` nav link scrolls to the section with the nav offset applied.
- [ ] All copy from `content.json`. No literal strings.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.

## Out of scope

Every other section. Do not touch `Base.astro` beyond the one `bindReveals()` call, and
do not touch `Footer.astro` or the nav — another block is being built in parallel.
