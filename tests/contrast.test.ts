import { expect, test } from 'bun:test'

import { Glob } from 'bun'

const root = new URL('../', import.meta.url)
const css = await Bun.file(new URL('src/styles/app.css', root)).text()

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
