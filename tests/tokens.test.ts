import { expect, test } from 'bun:test'

const css = await Bun.file(new URL('../src/styles/app.css', import.meta.url)).text()

/** Every `--name: value;` declaration in app.css, whitespace-normalized. */
const declarations = new Map(
  [...css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)[;}]/g)].map(([, name, value]) => [
    name!,
    value!.replace(/\s+/g, ' ').trim(),
  ]),
)

const COLOR_TOKENS: Record<string, [light: string, dark: string]> = {
  '--color-bg': ['#F4F5F7', '#08090C'],
  '--color-ink': ['#0B0D12', '#F3F5F9'],
  '--color-dim': ['#5E6675', '#8B94A7'],
  '--color-line': ['rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)'],
  '--color-surface': ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.035)'],
  '--color-glass': ['rgba(244, 245, 247, 0.72)', 'rgba(8, 9, 12, 0.6)'],
  '--color-accent': ['#0A8FAF', '#3EE7FF'],
  '--color-accent-soft': ['rgba(10, 143, 175, 0.08)', 'rgba(62, 231, 255, 0.08)'],
  '--color-violet': ['rgb(120, 90, 255)', 'rgb(170, 120, 255)'],
  '--color-console-bg': ['rgba(255, 255, 255, 0.75)', 'rgba(14, 16, 22, 0.85)'],
  '--color-contact-card': ['#0B0D12', '#F3F5F9'],
  '--color-contact-ink': ['#F3F5F9', '#0B0D12'],
}

const STEP_COLORS: Record<string, string> = {
  '--color-step-1': '#FF5C5C',
  '--color-step-2': '#FF9F43',
  '--color-step-3': '#FFD64D',
  '--color-step-4': '#9BE15D',
  '--color-step-5': '#3DDC84',
}

/** `rgba(0,0,0,.08)` and `rgba(0, 0, 0, 0.08)` are the same color. */
const canonical = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/(^|[(,])\./g, '$10.')

/** Splits `a, rgba(1, 2, 3, .4)` on commas that are not inside parentheses. */
const splitArguments = (value: string) => {
  const parts: string[] = ['']
  let depth = 0
  for (const char of value) {
    if (char === '(') depth++
    else if (char === ')') depth--
    if (char === ',' && depth === 0) parts.push('')
    else parts[parts.length - 1] += char
  }
  return parts
}

test.each(Object.entries(COLOR_TOKENS))(
  '%s uses light-dark() with both theme values',
  (token, [light, dark]) => {
    const value = canonical(declarations.get(token) ?? '')
    const inner = /^light-dark\((.+)\)$/.exec(value)
    expect(inner).not.toBeNull()
    expect(splitArguments(inner![1]!)).toEqual([canonical(light), canonical(dark)])
  },
)

test.each(Object.entries(STEP_COLORS))('%s is a theme-independent literal', (token, expected) => {
  expect(canonical(declarations.get(token) ?? '')).toBe(canonical(expected))
})

test('the alpha variants used more than once are their own tokens', () => {
  // Tailwind v4 cannot recompute alpha on a light-dark() color, so `bg-accent/8`
  // is impossible: every repeated alpha variant needs a token of its own.
  for (const token of ['--color-accent-soft', '--color-line', '--color-surface']) {
    expect(declarations.has(token)).toBe(true)
  }
})

const TEXT_TOKENS: Record<string, string> = {
  '--text-h1': 'clamp(36px, 5.5vw, 76px)',
  '--text-h2': 'clamp(32px, 4.5vw, 56px)',
  '--text-h2-stack': 'clamp(32px, 4.5vw, 48px)',
  '--text-h2-contact': 'clamp(34px, 5vw, 64px)',
  '--text-lead': 'clamp(26px, 3.4vw, 40px)',
  '--text-hero-sub': 'clamp(16px, 1.5vw, 19px)',
  '--text-body': '17px',
  '--text-card-title': 'clamp(19px, 1.8vw, 22px)',
  '--text-label': '12px',
  '--text-label-sm': 'clamp(10px, 1vw, 11px)',
}

test.each(Object.entries(TEXT_TOKENS))(
  '%s has the size from the design spec',
  (token, expected) => {
    expect(canonical(declarations.get(token) ?? '')).toBe(canonical(expected))
  },
)

const LEADING: Record<string, string> = {
  '--leading-h1': '1',
  '--leading-h2': '1.02',
  '--leading-h2-stack': '1.05',
  '--leading-h2-contact': '1',
  '--leading-lead': '1.2',
  '--leading-hero-sub': '1.55',
  '--leading-body': '1.5',
  '--leading-card-title': '1.15',
}

const TRACKING: Record<string, string> = {
  '--tracking-h1': '-0.04em',
  '--tracking-h2': '-0.035em',
  '--tracking-h2-stack': '-0.035em',
  '--tracking-h2-contact': '-0.04em',
  '--tracking-lead': '-0.025em',
  '--tracking-card-title': '-0.02em',
  '--tracking-label': '0.14em',
  '--tracking-label-sm': '0.1em',
}

test.each([...Object.entries(LEADING), ...Object.entries(TRACKING)])(
  '%s accompanies its role',
  (token, expected) => {
    expect(canonical(declarations.get(token) ?? '')).toBe(canonical(expected))
  },
)

test('every --text-* role carries its line-height and letter-spacing', () => {
  for (const role of Object.keys(TEXT_TOKENS)) {
    if (`--leading-${role.slice('--text-'.length)}` in LEADING) {
      expect(declarations.has(`${role}--line-height`)).toBe(true)
    }
    if (`--tracking-${role.slice('--text-'.length)}` in TRACKING) {
      expect(declarations.has(`${role}--letter-spacing`)).toBe(true)
    }
  }
})

test('font tokens name the self-hosted families plus fallbacks', () => {
  expect(declarations.get('--font-sans')).toMatch(/^Manrope,/)
  expect(declarations.get('--font-sans')).toMatch(/-apple-system/)
  expect(declarations.get('--font-sans')).toMatch(/sans-serif$/)
  expect(declarations.get('--font-mono')).toMatch(/^"IBM Plex Mono",/)
  expect(declarations.get('--font-mono')).toMatch(/ui-monospace/)
  expect(declarations.get('--font-mono')).toMatch(/monospace$/)
})

test('the three faces are self-hosted from /fonts with font-display: swap', () => {
  const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => body!)
  expect(faces).toHaveLength(3)
  for (const face of faces) expect(face).toMatch(/font-display:\s*swap/)

  const sources = faces.map((face) => /url\(([^)]+)\)/.exec(face)?.[1]?.replace(/["']/g, ''))
  expect(sources.sort()).toEqual([
    '/fonts/ibm-plex-mono-400.woff2',
    '/fonts/ibm-plex-mono-500.woff2',
    '/fonts/manrope-var.woff2',
  ])

  const manrope = faces.find((face) => face.includes('manrope-var'))!
  expect(manrope).toMatch(/font-weight:\s*200 800/)
  expect(css).not.toMatch(/fonts\.(googleapis|gstatic)\.com/)
})

test('the root declares color-scheme so light-dark() can resolve', () => {
  expect(css).toMatch(/color-scheme:\s*light dark/)
})

const KEYFRAMES = [
  'blink',
  'pulse',
  'aur1',
  'aur2',
  'rise',
  'spin',
  'gridflow',
  'shimmer',
  'marquee',
]

test.each(KEYFRAMES)('@keyframes %s is declared', (name) => {
  expect(css).toMatch(new RegExp(`@keyframes\\s+${name}\\s*{`))
})

test('the keyframes live outside @theme', () => {
  const theme = /@theme[^{]*{/.exec(css)
  expect(theme).not.toBeNull()
  let depth = 0
  let end = theme!.index + theme![0].length
  for (; end < css.length; end++) {
    if (css[end] === '{') depth++
    else if (css[end] === '}') {
      if (depth === 0) break
      depth--
    }
  }
  expect(css.slice(theme!.index, end)).not.toMatch(/@keyframes/)
})
