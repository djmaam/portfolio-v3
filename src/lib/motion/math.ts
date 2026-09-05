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
