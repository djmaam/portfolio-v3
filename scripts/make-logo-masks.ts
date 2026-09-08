/**
 * Turns the raw company marks in `assets-src/logos/` into the alpha masks the experience
 * timeline renders (`src/assets/logos/*.png`, spec 15).
 *
 * The timeline paints each mark with `mask-image` over a token-colored surface, so what
 * ships is a shape, not a picture: only the alpha channel survives. That is the whole
 * reason this script exists — every source is a flat, full-color raster (three of the
 * five are JPEGs, which have no alpha at all), and the shape has to be recovered from
 * the pixels before the CSS can use it.
 *
 * Recovering it is a threshold, because every source is bimodal: a mark at one
 * luminance against a background at another, with nothing in between. `probe` prints
 * the histogram each `threshold` below was read off.
 *
 * Run: `bun scripts/make-logo-masks.ts`
 */
import { mkdir, readdir, rm, stat } from 'node:fs/promises'

import sharp from 'sharp'

/** How the mark sits in its source, which is all the threshold needs to know. */
interface Logo {
  /** The `abbr` of the matching job in `handoff/content.json`. Also the filename. */
  abbr: string
  file: string
  /** Luminance splitting mark from background, read off the source's histogram. */
  threshold: number
  /** True when the mark is the *lighter* side of that split (white on a dark plate). */
  markIsBright: boolean
  /**
   * Which part of the source is the mark, once color is gone.
   *
   * - `strokes` — no plate at all: what is drawn is the mark.
   * - `plate` — the mark is the solid tile, and the shape inside it stays a hole.
   * - `knockout` — the mark is the shape cut out of the tile, and the tile is dropped.
   *
   * `plate` and `knockout` are both defensible for any tile, and the choice is per
   * company rather than global: it depends on whether the tile carries the identity or
   * is a generic app-icon backdrop. Rendered side by side at 56px, Nera's rounded square
   * and Telecentro's play triangle are the marks people recognize, while DePC's gradient
   * square is filler that masks to an unreadable block with sharp corners fighting the
   * frame's radius.
   */
  reading: 'strokes' | 'plate' | 'knockout'
  /** Region of interest, for a source that is not already cropped to the mark. */
  crop?: { left: number; top: number; width: number; height: number }
}

const LOGOS: Logo[] = [
  // Green tile, white arrow knocked out of it. Plate lum ~155, paper 255.
  { abbr: 'NR', file: 'NR.jpeg', threshold: 205, markIsBright: false, reading: 'plate' },
  // Cyan play triangle, white "T" knocked out of it. Plate lum ~129, paper 255.
  { abbr: 'TC', file: 'TC.png', threshold: 200, markIsBright: false, reading: 'plate' },
  // Three open leaves drawn on white. No plate: the strokes are the mark.
  { abbr: 'AP', file: 'AP.jpeg', threshold: 215, markIsBright: false, reading: 'strokes' },
  // Purple-to-pink gradient square, "DePC" knocked out in white. Plate lum < 102, and
  // the plate is a generic app-icon backdrop, so the wordmark is what survives.
  { abbr: 'DP', file: 'DP.jpg', threshold: 180, markIsBright: false, reading: 'knockout' },
  // White line mark on a starfield banner: the only source is a wide hero image, so the
  // diamonds are cropped out of it first and the wordmark below is left behind.
  {
    abbr: 'UC',
    file: 'UC.png',
    threshold: 190,
    markIsBright: true,
    reading: 'strokes',
    crop: { left: 410, top: 35, width: 200, height: 145 },
  },
]

/** Long edge of what ships: ~5x the ~48px the mark renders at, sharp past DPR 3. */
const OUTPUT_SIZE = 256
/** Luminance half-width of the ramp that keeps thresholded edges from going jagged. */
const SOFT = 24

const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

/**
 * Alpha of one pixel: 1 deep inside the mark, 0 deep inside the background, ramped
 * across `SOFT` luminance either side of the threshold so the edge stays antialiased at
 * the size this renders — a hard cut reads as stair-stepping on a 48px mark.
 */
function inkAlpha(lum: number, { threshold, markIsBright }: Logo) {
  const signed = markIsBright ? lum - threshold : threshold - lum
  return Math.min(1, Math.max(0, (signed + SOFT) / (2 * SOFT)))
}

/**
 * Marks every background pixel reachable from the border, so the *enclosed* background —
 * the knockout inside a plate — can be told apart from the paper around it. Both are the
 * same white; only connectivity separates them.
 */
function floodFromBorder(isInk: Uint8Array, width: number, height: number) {
  const outside = new Uint8Array(width * height)
  const queue: number[] = []

  const push = (i: number) => {
    if (isInk[i] || outside[i]) return
    outside[i] = 1
    queue.push(i)
  }

  for (let x = 0; x < width; x++) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    push(y * width)
    push(y * width + width - 1)
  }

  // Explicit stack rather than recursion: a 512x512 plate overflows the call stack.
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head]!
    const x = i % width
    const y = (i / width) | 0
    if (x > 0) push(i - 1)
    if (x < width - 1) push(i + 1)
    if (y > 0) push(i - width)
    if (y < height - 1) push(i + width)
  }

  return outside
}

async function build(logo: Logo, outDir: string) {
  const source = sharp(`assets-src/logos/${logo.file}`).ensureAlpha()
  const cropped = logo.crop ? source.extract(logo.crop) : source
  const { data, info } = await cropped.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  const alpha = new Float32Array(width * height)
  for (let p = 0; p < width * height; p++) {
    const i = p * channels
    alpha[p] = inkAlpha(luminance(data[i]!, data[i + 1]!, data[i + 2]!), logo)
  }

  // The knockout reading keeps only the shape punched out of the plate: the background
  // *enclosed* by the mark becomes the ink, and everything the border can reach is
  // dropped along with the plate itself.
  if (logo.reading === 'knockout') {
    const isInk = new Uint8Array(width * height)
    for (let p = 0; p < alpha.length; p++) isInk[p] = alpha[p]! > 0.5 ? 1 : 0
    const outside = floodFromBorder(isInk, width, height)
    for (let p = 0; p < alpha.length; p++) alpha[p] = outside[p] ? 0 : 1 - alpha[p]!
  }

  // RGB is discarded by `mask-image`; black keeps the file small and makes the PNG
  // legible in a viewer as the shape it is.
  const rgba = Buffer.alloc(width * height * 4)
  for (let p = 0; p < alpha.length; p++) rgba[p * 4 + 3] = Math.round(alpha[p]! * 255)

  const out = `${outDir}/${logo.abbr}.png`
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    // To the mark's own bounding box; `contain` handles the rest. The background has to
    // be named: left to infer it from the top-left pixel, a mark that reaches its own
    // border — a plate — is read as the thing to trim, and gets eaten down to the shape
    // knocked out of it.
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize({ width: OUTPUT_SIZE, height: OUTPUT_SIZE, fit: 'inside', withoutEnlargement: true })
    .toFile(out)

  const { width: w, height: h } = await sharp(out).metadata()
  const { size } = await stat(out)
  console.log(
    `  ${logo.abbr}  ${String(w).padStart(3)}x${String(h).padEnd(3)} ` +
      `${String(Math.round(size / 1024)).padStart(3)}KB  ${logo.reading}`,
  )
}

const OUT_DIR = 'src/assets/logos'

// Rebuilt from scratch every run: a logo dropped from `LOGOS` must not linger as a file
// the component still globs up.
await rm(OUT_DIR, { recursive: true, force: true })
await mkdir(OUT_DIR, { recursive: true })

for (const logo of LOGOS) await build(logo, OUT_DIR)

const written = await readdir(OUT_DIR)
console.log(`${written.length} masks written`)
