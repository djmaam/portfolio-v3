import { expect, test } from 'bun:test'

import { Glob } from 'bun'

import { auroraStyle } from '../src/lib/motion/math'

const root = new URL('../', import.meta.url)
const css = await Bun.file(new URL('src/styles/app.css', root)).text()
const contactSource = await Bun.file(new URL('src/components/Contact.astro', root)).text()

// ── Token parsing ────────────────────────────────────────────────────────────
// A one-time audit rots the day a token changes. `app.css` holds every color as a
// `light-dark(light, dark)` pair, so the ratios of `DESIGN_SPEC` §6 are computable and
// this file recomputes them on every run instead of trusting a number written by hand.

type Rgba = [r: number, g: number, b: number, a: number]

/** Splits `a, rgba(1, 2, 3, .4)` on the commas that are not inside parentheses. */
const splitArguments = (value: string) => {
  const parts: string[] = ['']
  let depth = 0
  for (const char of value) {
    if (char === '(') depth++
    else if (char === ')') depth--
    if (char === ',' && depth === 0) parts.push('')
    else parts[parts.length - 1] += char
  }
  return parts.map((part) => part.trim())
}

/** `#rgb`, `#rrggbb`, `rgb(...)` and `rgba(...)` — the three notations app.css uses. */
function parseColor(value: string): Rgba {
  const text = value.trim()
  if (text.startsWith('#')) {
    const hex = text.slice(1)
    const pairs =
      hex.length === 3
        ? [...hex].map((digit) => digit + digit)
        : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)]
    const [r, g, b] = pairs.map((pair) => parseInt(pair, 16))
    return [r!, g!, b!, 1]
  }
  const inner = /^rgba?\((.+)\)$/.exec(text)
  if (!inner) throw new Error(`Unsupported color notation: ${value}`)
  const parts = splitArguments(inner[1]!).map(Number)
  return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1]
}

/** Every `--color-*: light-dark(a, b)` declaration of app.css, per theme. */
const themes = { light: 0, dark: 1 } as const
type Theme = keyof typeof themes

const tokens = new Map<string, [Rgba, Rgba]>()
for (const [, name, value] of css.matchAll(/(--color-[\w-]+)\s*:\s*(light-dark\([^;]+\))\s*;/g)) {
  const inner = /^light-dark\((.+)\)$/s.exec(value!.replace(/\s+/g, ' ').trim())
  if (!inner) continue
  const [light, dark] = splitArguments(inner[1]!)
  tokens.set(name!, [parseColor(light!), parseColor(dark!)])
}

const token = (name: string, theme: Theme): Rgba => {
  const pair = tokens.get(name)
  if (!pair) throw new Error(`${name} is not a light-dark() token of app.css`)
  return pair[themes[theme]]
}

// ── WCAG 2.1 relative luminance ──────────────────────────────────────────────

/** Source-over compositing: a translucent token only has a ratio against what is behind it. */
const over = (fg: Rgba, bg: Rgba): Rgba => [
  fg[0] * fg[3] + bg[0] * (1 - fg[3]),
  fg[1] * fg[3] + bg[1] * (1 - fg[3]),
  fg[2] * fg[3] + bg[2] * (1 - fg[3]),
  1,
]

/** WCAG 2.1 §relative luminance. */
function luminance([r, g, b]: Rgba): number {
  const channel = (value: number) => {
    const srgb = value / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function ratio(fg: Rgba, bg: Rgba): number {
  const [a, b] = [luminance(fg), luminance(bg)]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// ── The table of spec 16 §2 ──────────────────────────────────────────────────
// `accent` over `bg` is the only 3.0: `DESIGN_SPEC` §6 allows the cyan as text at ≥15px
// or weight 500, which is WCAG's large-text threshold. The greppable half of that rule
// is the last test of this file.

const PAIRS: { name: string; minimum: number; of: (theme: Theme) => [Rgba, Rgba] }[] = [
  {
    name: 'ink on bg',
    minimum: 4.5,
    of: (theme) => [token('--color-ink', theme), token('--color-bg', theme)],
  },
  {
    name: 'dim on bg',
    minimum: 4.5,
    of: (theme) => [token('--color-dim', theme), token('--color-bg', theme)],
  },
  {
    name: 'dim on surface over bg',
    minimum: 4.5,
    of: (theme) => [
      token('--color-dim', theme),
      over(token('--color-surface', theme), token('--color-bg', theme)),
    ],
  },
  {
    name: 'accent on bg',
    minimum: 3,
    of: (theme) => [token('--color-accent', theme), token('--color-bg', theme)],
  },
  {
    name: 'contact-ink on contact-card',
    minimum: 4.5,
    of: (theme) => [token('--color-contact-ink', theme), token('--color-contact-card', theme)],
  },
  {
    name: 'contact-accent on contact-card',
    minimum: 4.5,
    of: (theme) => [token('--color-contact-accent', theme), token('--color-contact-card', theme)],
  },
]

test.each(
  PAIRS.flatMap(({ name, minimum, of }) =>
    (Object.keys(themes) as Theme[]).map((theme) => [name, minimum, theme, of] as const),
  ),
)('%s is at least %p:1 in the %s theme', (name, minimum, theme, of) => {
  const [fg, bg] = of(theme)
  const value = ratio(fg, bg)
  // The number is in the message because a failure has to say by how much.
  expect(`${name} / ${theme}: ${value.toFixed(2)}`).toBe(
    `${name} / ${theme}: ${Math.max(value, minimum).toFixed(2)}`,
  )
})

// ── The accent as text ───────────────────────────────────────────────────────
// `accent on bg` clears 3.0 and not 4.5, so the cyan is only a legal text color at the
// large-text threshold: `DESIGN_SPEC` §6 states it as ≥15px or weight ≥500. A component
// that paints text with it therefore has to say which of the two it relies on, in the
// rule itself or in the rule for that element's own class.

/** `selector { body }` for every rule of a `<style>` block, nesting included. */
function rules(styles: string): { selector: string; body: string }[] {
  const found: { selector: string; body: string }[] = []
  let head = ''
  for (let index = 0; index < styles.length; index++) {
    const char = styles[index]
    if (char === '}') {
      head = ''
      continue
    }
    if (char !== '{') {
      head += char
      continue
    }
    let depth = 1
    let end = index + 1
    for (; end < styles.length && depth > 0; end++) {
      if (styles[end] === '{') depth++
      else if (styles[end] === '}') depth--
    }
    const selector = head.trim()
    const body = styles.slice(index + 1, end - 1)
    // At-rules wrap other rules; their body is walked, they are not a rule themselves.
    if (selector.startsWith('@')) {
      found.push(...rules(body))
    } else {
      found.push({ selector, body })
    }
    head = ''
    index = end - 1
  }
  return found
}

/** The classes of the last compound of a selector: `.metric:last-child .figure` → `figure`. */
const ownClasses = (selector: string) =>
  [...(selector.split(/[\s>+~]+/).pop() ?? '').matchAll(/\.([\w-]+)/g)].map(([, name]) => name!)

const MINIMUM_SIZE = 15
const MINIMUM_WEIGHT = 500

/** A `font-size`/`font-weight` in this body that clears the large-text threshold. */
function clearsThreshold(body: string): boolean {
  const size = /font-size:\s*([^;]+)/.exec(body)?.[1]
  if (size) {
    // `clamp(a, b, c)`: the floor is what the narrowest viewport renders.
    const floor = /(\d+(?:\.\d+)?)px/.exec(size)?.[1]
    if (floor && Number(floor) >= MINIMUM_SIZE) return true
  }
  const weight = /font-weight:\s*(\d+)/.exec(body)?.[1]
  return weight !== undefined && Number(weight) >= MINIMUM_WEIGHT
}

const components = (
  await Array.fromAsync(new Glob('src/components/*.astro').scan({ cwd: Bun.fileURLToPath(root) }))
).sort()

test.each(components)(
  '%s only paints text with the accent at ≥15px or weight ≥500',
  async (file) => {
    const source = await Bun.file(new URL(file, root)).text()
    const styles = [...source.matchAll(/<style>([\s\S]*?)<\/style>/g)]
      .map(([, body]) => body!)
      .join('\n')
    const parsed = rules(styles)

    const offenders = parsed
      .filter(({ body }) => /(^|[;{\s])color:\s*var\(--color-accent\)/.test(body))
      .filter(({ selector, body }) => {
        if (clearsThreshold(body)) return false
        // `.mark` (`CubeMark.astro`, spec 30) paints SVG graphics through `currentColor`,
        // never text: its guarantee is the 3:1 non-text "accent on bg" ratio asserted
        // above, not the large-text exception this loop otherwise enforces. Keyed to the
        // file as well as the class, so a future component reusing the name `.mark` for
        // real text does not inherit the carve-out.
        if (file.endsWith('/CubeMark.astro') && ownClasses(selector).includes('mark')) return false
        // The size or the weight may sit on the element's own class instead — a `:hover`
        // that only changes the color must not also change the weight, or the text reflows.
        const classes = ownClasses(selector)
        return !parsed.some(
          (rule) =>
            rule.body !== body &&
            classes.includes(ownClasses(rule.selector)[0] ?? '') &&
            ownClasses(rule.selector).length === 1 &&
            clearsThreshold(rule.body),
        )
      })
      .map(({ selector }) => selector)

    expect(offenders).toEqual([])
  },
)

// ── The aurora behind the footer (spec 26) ───────────────────────────────────
// The aurora is decoration, but it is painted between `--color-bg` and everything that
// has no background of its own — the footer above all. Its retune (spec 26) is a color
// decision, so it gets asserted here, on the composited result, rather than eyeballed:
// the blobs are read from `app.css`, the CSS filter matrices are actually applied, and
// the footer's ratios are recomputed against the worst frame of the sweep.

/** The `--color-*` token and alpha of every `.aurora` blob, per theme. */
const auroraBlobs: { token: string; alpha: number }[][] = (() => {
  const layers: { token: string; alpha: number }[][] = [[], []]
  for (const [, body] of css.matchAll(/\.aurora\s*>\s*:nth-child\(\d\)\s*\{([\s\S]*?)\n {2}\}/g)) {
    const background = /background:\s*([\s\S]*?);/.exec(body!)?.[1]
    if (!background) continue
    const mixes = [
      ...background.matchAll(/color-mix\(in srgb,\s*var\((--color-[\w-]+)\)\s*([\d.]+)%/g),
    ].map(([, name, percent]) => ({ token: name!, alpha: Number(percent) / 100 }))
    if (mixes.length === 0) continue
    // `light-dark(a, b)` gives one mix per theme; a bare `color-mix` is the same in both.
    layers[0]!.push(mixes[0]!)
    layers[1]!.push(mixes[1] ?? mixes[0]!)
  }
  return layers
})()

test('the three blobs of MOTION_SPEC §4 are what this file composites', () => {
  expect(auroraBlobs[0]!).toHaveLength(3)
  expect(auroraBlobs[1]!).toHaveLength(3)
})

/** `filter: hue-rotate(deg) saturate(s)` as the matrix pair of Filter Effects §8.6-8.7. */
function filtered([r, g, b, a]: Rgba, degrees: number, saturation: number): Rgba {
  const apply = (m: number[], [x, y, z]: [number, number, number]): [number, number, number] => [
    m[0]! * x + m[1]! * y + m[2]! * z,
    m[3]! * x + m[4]! * y + m[5]! * z,
    m[6]! * x + m[7]! * y + m[8]! * z,
  ]
  const radians = (degrees * Math.PI) / 180
  const [cos, sin] = [Math.cos(radians), Math.sin(radians)]
  const hue = [
    0.213 + cos * 0.787 - sin * 0.213,
    0.715 - cos * 0.715 - sin * 0.715,
    0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143,
    0.715 + cos * 0.285 + sin * 0.14,
    0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787,
    0.715 - cos * 0.715 + sin * 0.715,
    0.072 + cos * 0.928 + sin * 0.072,
  ]
  const s = saturation
  const saturate = [
    0.213 + 0.787 * s,
    0.715 - 0.715 * s,
    0.072 - 0.072 * s,
    0.213 - 0.213 * s,
    0.715 + 0.285 * s,
    0.072 - 0.072 * s,
    0.213 - 0.213 * s,
    0.715 - 0.715 * s,
    0.072 + 0.928 * s,
  ]
  // Filters run left to right, and the shorthand functions operate on sRGB values.
  const [x, y, z] = apply(saturate, apply(hue, [r, g, b]))
  const clamp = (value: number) => Math.min(255, Math.max(0, value))
  return [clamp(x), clamp(y), clamp(z), a]
}

/** The hue of an sRGB color, in degrees. */
function hueOf([r, g, b]: Rgba): number {
  const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)]
  if (max === min) return 0
  const d = max - min
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

/** `auroraStyle`'s filter, parsed back into the two numbers this file needs. */
function auroraFilter(p: number): { degrees: number; saturation: number } {
  const { filter } = auroraStyle(p)
  const parsed = /hue-rotate\(([\d.-]+)deg\) saturate\(([\d.]+)\)/.exec(filter)
  if (!parsed) throw new Error(`Unexpected aurora filter: ${filter}`)
  return { degrees: Number(parsed[1]), saturation: Number(parsed[2]) }
}

// The arc the palette owns: cyan (~188°) through violet (~262°) to magenta. Green and
// amber — everything below 170° — are what the 260° sweep of §4 reached and spec 26 caps.
const [ARC_START, ARC_END] = [170, 335]
const SWEEP = Array.from({ length: 21 }, (_, i) => i / 20)

test.each(Object.keys(themes) as Theme[])(
  'every aurora blob stays inside the cyan-violet arc across the sweep, in the %s theme',
  (theme) => {
    const outside: string[] = []
    for (const p of SWEEP) {
      const { degrees, saturation } = auroraFilter(p)
      for (const { token: name, alpha } of auroraBlobs[themes[theme]]!) {
        const hue = hueOf(filtered(token(name, theme), degrees, saturation))
        if (hue < ARC_START || hue > ARC_END) {
          outside.push(`${name} @ p=${p} (α ${alpha}): ${hue.toFixed(0)}°`)
        }
      }
    }
    expect(outside).toEqual([])
  },
)

test('the sweep still moves the hue — capping it is not the same as removing it', () => {
  // `hue-rotate` is a matrix approximation, so a nominal 50° moves the accent about 24°
  // and the violet about 55°. What matters is that the cap did not flatten the motion.
  const { degrees, saturation } = auroraFilter(1)
  for (const [name, theme] of [
    ['--color-accent', 'dark'],
    ['--color-violet', 'light'],
  ] as [string, Theme][]) {
    const rested = hueOf(token(name, theme))
    const swept = hueOf(filtered(token(name, theme), degrees, saturation))
    expect(swept - rested).toBeGreaterThan(20)
  }
})

/**
 * The worst background the footer can be asked to sit on. Only **two** blobs are stacked:
 * horizontally they span 55–111vw, 20–64vw and 70–106vw, so no band of the viewport is
 * covered by all three, but every pair does overlap. Each pair is tried at every point of
 * the sweep, and the frame that moves the background furthest from `--color-bg` wins —
 * that is the one most likely to break a ratio measured against the bare token.
 */
function worstAuroraBackground(theme: Theme): Rgba {
  const bg = token('--color-bg', theme)
  const blobs = auroraBlobs[themes[theme]]!
  let [worst, worstDistance]: [Rgba, number] = [bg, -1]
  for (const p of SWEEP) {
    const { degrees, saturation } = auroraFilter(p)
    const { opacity } = auroraStyle(p)
    for (const pair of [
      [0, 1],
      [0, 2],
      [1, 2],
    ]) {
      let stacked = bg
      for (const index of pair) {
        const { token: name, alpha } = blobs[index]!
        const [r, g, b] = filtered(token(name, theme), degrees, saturation)
        stacked = over([r, g, b, alpha], stacked)
      }
      // Group opacity applies to the composited layer, not to each blob separately.
      const composited = over([stacked[0], stacked[1], stacked[2], opacity], bg)
      const distance = Math.abs(luminance(composited) - luminance(bg))
      if (distance > worstDistance) [worst, worstDistance] = [composited, distance]
    }
  }
  return worst
}

const FOOTER_PAIRS: { name: string; token: string; minimum: number }[] = [
  // The footer paints no background of its own: `--color-dim` on the signature line,
  // `--color-ink` on the ASCIImoji, `--color-accent` on its links — the accent as text,
  // so its threshold is the large-text 3:1 of the table above, not 4.5.
  { name: 'dim', token: '--color-dim', minimum: 4.5 },
  { name: 'ink', token: '--color-ink', minimum: 4.5 },
  { name: 'accent', token: '--color-accent', minimum: 3 },
]

test.each(
  FOOTER_PAIRS.flatMap(({ name, token: fg, minimum }) =>
    (Object.keys(themes) as Theme[]).map((theme) => [name, minimum, theme, fg] as const),
  ),
)(
  'footer %s is at least %p:1 over the strongest aurora, in the %s theme',
  (name, minimum, theme, fg) => {
    const value = ratio(token(fg, theme), worstAuroraBackground(theme))
    expect(`${name} / ${theme}: ${value.toFixed(2)}`).toBe(
      `${name} / ${theme}: ${Math.max(value, minimum).toFixed(2)}`,
    )
  },
)

test('the contact card is opaque, so the aurora never reaches the text inside it', () => {
  // The one thing that would invalidate the test above for the contact section.
  for (const theme of Object.keys(themes) as Theme[]) {
    expect(token('--color-contact-card', theme)[3]).toBe(1)
  }
  expect(contactSource).toContain('background: var(--color-contact-card)')
})
