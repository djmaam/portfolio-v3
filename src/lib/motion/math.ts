// Every motion issue drops its math here: pure functions, no DOM, covered by `bun test`.
// The modules that own the plumbing (scroll.ts, reveal.ts, …) stay dumb on purpose.

/** Trims float noise so the style strings stay short and stable. */
const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Document progress of `MOTION_SPEC` §4: `scrollY / (scrollHeight - vh)`, clamped to
 * [0, 1]. A document that does not scroll has no progress, so it reports 0 instead of
 * dividing by zero.
 */
export function docProgress(scrollY: number, scrollHeight: number, vh: number): number {
  const max = scrollHeight - vh
  if (max <= 0) return 0
  return Math.min(1, Math.max(0, scrollY / max))
}

/**
 * Aurora state at a given document progress (`MOTION_SPEC` §4): the hue sweeps cyan →
 * violet → magenta → amber, the opacity ramps .45 → 1 over the first 40% of the
 * document, and the whole layer drifts up 12vh.
 */
export function auroraStyle(p: number): { filter: string; opacity: number; translateY: string } {
  return {
    filter: `hue-rotate(${Math.round(p * 260)}deg) saturate(${round(1 + 0.4 * p, 3)})`,
    opacity: 0.45 + 0.55 * Math.min(1, p * 2.5),
    translateY: `${round(-12 * p)}vh`,
  }
}

/** The console glyphs the scramble draws from (`MOTION_SPEC` §1). */
const GLYPHS = '<>/_-=+*#%&{}[]|\\01'

/**
 * One frame of the scramble of `MOTION_SPEC` §1, at progress `p` ∈ [0, 1]. The resolved
 * prefix is `floor(p² · len)` characters, so the text settles left to right and
 * accelerates; everything past it is a random glyph, except spaces, which never scramble
 * so the word shape holds. `rand` is injectable to keep the tests deterministic.
 */
export function scrambleFrame(target: string, p: number, rand: () => number = Math.random): string {
  const resolved = Math.floor(p ** 2 * target.length)
  let out = target.slice(0, resolved)
  for (let i = resolved; i < target.length; i++) {
    // `Math.random` never returns 1, but an injected `rand` might: clamp, don't trust.
    out +=
      target[i] === ' '
        ? ' '
        : GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(rand() * GLYPHS.length))]
  }
  return out
}

/**
 * Where an anchor link should scroll to: the target's document top minus the nav that
 * would cover it (`MOTION_SPEC` §1). Clamped at 0, which is both what `#top` needs and
 * what any target sitting under the nav needs.
 */
export function anchorOffset(top: number, navH: number): number {
  return Math.max(0, top - navH)
}

/**
 * When the element with `data-boot="n"` is revealed (`MOTION_SPEC` §2): 500ms for the
 * page to settle, then 170ms per step. The console skips to `n = 10`, i.e. 2200ms, which
 * leaves room for more elements in the text column without moving it.
 */
export function bootDelay(n: number): number {
  return 500 + n * 170
}

/**
 * Characters of the typed eyebrow visible after `elapsed` ms at `perChar` ms each
 * (`MOTION_SPEC` §2). A negative `elapsed` — the wait before the first character — yields
 * 0, so the driver expresses its delay as an offset instead of a timer of its own.
 */
export function typedLength(elapsed: number, perChar: number, total: number): number {
  return Math.min(total, Math.max(0, Math.floor(elapsed / perChar)))
}

/**
 * The console metrics at a given tick, exactly as the mock computes them
 * (`Portfolio.dc.html:696`): `agents` flips between 3 and 4, `specs` gains one per full
 * pass of the 11-message log, and `shipped` one per six lines. Only ever counts up.
 */
export function metricsAt(tick: number): { agents: number; specs: number; shipped: number } {
  return {
    agents: 3 + (tick % 2),
    specs: 12 + Math.floor(tick / 11),
    shipped: 41 + Math.floor(tick / 6),
  }
}

/**
 * Indices into the console log of the at most `max` lines still visible after `tick` of
 * them have been emitted, over a source of `length` messages that cycles forever
 * (`MOTION_SPEC` §2). The oldest line drops as the newest enters, so the window never
 * grows past `max`. `Console.astro` renders `logWindow(max, …)` — the first six of the
 * cycle — so the markup and the first client frame agree.
 */
export function logWindow(tick: number, length: number, max: number): number[] {
  const from = Math.max(0, tick - max)
  return Array.from({ length: tick - from }, (_, i) => (from + i) % length)
}
