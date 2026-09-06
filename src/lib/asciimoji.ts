import { prefersReducedMotion } from './motion/reduced'

/**
 * The fifteen ASCIImoji of the footer (`MOTION_SPEC` §12), in the mock's order. Copied
 * verbatim from `handoff/reference/Portfolio.dc.html`: several carry combining marks, so
 * the test compares them against the spec instead of trusting the eye.
 *
 * Its own module rather than `motion/math.ts`: this is a list of faces, not motion math.
 */
export const MOJI: readonly string[] = [
  '(⌐■_■)',
  '¯\\_(ツ)_/¯',
  '( ͡° ͜ʖ ͡°)',
  'ʕ•ᴥ•ʔ',
  '\\(^o^)/',
  'ᕕ( ᐛ )ᕗ',
  '(~˘▾˘)~',
  '(☞ﾟヮﾟ)☞',
  '(づ｡◕‿‿◕｡)づ',
  '(╯°□°)╯︵ ┻━┻',
  '┬─┬ノ( º _ ºノ)',
  '(•_•)>⌐■-■',
  '[¬º-°]¬',
  "(ง'̀-'́)ง",
  '⊂(◉‿◉)つ',
]

/** One face every 1000ms (`MOTION_SPEC` §12). */
export const MOJI_INTERVAL_MS = 1000

export function asciimojiAt(tick: number): string {
  return MOJI[tick % MOJI.length] as string
}

/**
 * Drives the rotation and returns nothing to unsubscribe from: the footer lives as long
 * as the document does. With `prefers-reduced-motion: reduce` no timer is started at all
 * and the face the server rendered is the only one the visitor ever sees.
 */
export function rotateMoji(render: (face: string) => void): void {
  if (prefersReducedMotion()) return

  // The markup already shows face 0, so the first tick is the second face.
  let tick = 0
  setInterval(() => render(asciimojiAt(++tick)), MOJI_INTERVAL_MS)
}
