import { expect, test } from 'bun:test'

import { content, LANGS } from '../src/lib/content'
import { PREVIEWS, previewMode, projectDelay } from '../src/lib/projects'

/** The hosts that answered a framing check on 2026-09-05 (spec 11, design doc §8). */
const BLOCKED = ['creativamedialab.com', 'telecentro.com.ar']

const hosts = LANGS.flatMap((lang) => content[lang].projects.map((project) => project.host))

test('every project in content.json has a declared preview mode', () => {
  for (const host of hosts) expect(PREVIEWS[host]).toBeDefined()
})

test('the two hosts that block framing are screenshots, the other four are iframes', () => {
  const modes = [...new Set(hosts)].map((host) => [host, previewMode(host)])

  expect(Object.fromEntries(modes)).toEqual({
    'nera-agro.com': 'iframe',
    'agropro.ag': 'iframe',
    'kodaiverse.com': 'iframe',
    'masushuaia.com': 'iframe',
    'creativamedialab.com': 'screenshot',
    'telecentro.com.ar': 'screenshot',
  })
  for (const host of BLOCKED) expect(previewMode(host)).toBe('screenshot')
})

test('the mode is keyed by host, so reordering content.json cannot swap it', () => {
  // The table is read by host, never by position: the reversed list yields the same
  // modes, which is what keeps an iframe off a site that answers `X-Frame-Options`.
  const forward = content.es.projects.map((project) => previewMode(project.host))
  const reversed = [...content.es.projects].reverse().map((project) => previewMode(project.host))

  expect(reversed).toEqual([...forward].reverse())
  expect(Object.keys(PREVIEWS).every((key) => Number.isNaN(Number(key)))).toBe(true)
})

test('a host nobody declared falls back to a screenshot, never to an iframe', () => {
  expect(previewMode('example.com')).toBe('screenshot')
})

test('projectDelay staggers 90ms per column, so each row starts over', () => {
  expect([0, 1, 2, 3, 4, 5].map(projectDelay)).toEqual([0, 90, 180, 0, 90, 180])
})

/**
 * The rest of the block is markup, so what is guarded is the shape of the component:
 * the previews are decoration and must not reach the keyboard, the copy comes from
 * `content.json`, and the shimmer only runs when motion is welcome.
 */
const source = await Bun.file(new URL('../src/components/Projects.astro', import.meta.url)).text()
const [, frontmatter = '', body = ''] = /^---([\s\S]*?)^---([\s\S]*)$/m.exec(source) ?? []
const [, styles = ''] = /<style>([\s\S]*?)<\/style>/.exec(body) ?? []
const markup = body.replace(/<style>[\s\S]*?<\/style>/g, '')
const [, iframe = ''] = /<iframe([\s\S]*?)\/>/.exec(markup) ?? []

test('exactly one iframe is written, and only projects in iframe mode render it', () => {
  expect(markup.match(/<iframe/g)).toHaveLength(1)
  // The screenshot projects mount no iframe at all: the tag sits behind the mode.
  expect(markup).toMatch(/project\.iframe &&[\s\S]*?<iframe/)
})

test('the iframe is lazy, sandboxed and out of the accessibility tree', () => {
  expect(iframe).toMatch(/loading="lazy"/)
  expect(iframe).toMatch(/sandbox/)
  expect(iframe).toMatch(/aria-hidden="true"/)
  expect(iframe).toMatch(/tabindex="-1"/)
  // A tab stop over a decorative preview is the a11y bug this pair guards.
  expect(styles).toMatch(/\.frame \{[^}]*pointer-events: none/)
})

test('the screenshot falls back to the striped placeholder while the files are missing', () => {
  expect(frontmatter).toMatch(/existsSync/)
  expect(frontmatter).toMatch(/previews\/\$\{project\.host\}\.png/)
  expect(markup).toMatch(/project\.shot &&/)
  expect(styles).toMatch(/repeating-linear-gradient/)
})

test('the shimmer runs only under prefers-reduced-motion: no-preference', () => {
  const [, animated = ''] =
    /@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*)/.exec(styles) ?? []
  expect(styles).toMatch(/@media \(prefers-reduced-motion: no-preference\)/)
  expect(animated).toMatch(/animation: shimmer 2\.8s ease-in-out infinite/)
  expect(styles.replace(animated, '')).not.toMatch(/animation:/)
})

test('the reveal sits on the wrapper and the hover transform on the card', () => {
  expect(markup).toMatch(/<li data-reveal data-delay=\{project\.delay\}>/)
  expect(styles).toMatch(/\.card:hover \{[^}]*transform: translateY\(-4px\)/)
})

test('every string comes from content.ts', () => {
  expect(frontmatter).toMatch(/from '\.\.\/lib\/content'/)
  expect(markup).toMatch(/t\.secProjects/)
  expect(markup).toMatch(/t\.projectsTitle/)
  expect(markup).toMatch(/t\.projectsSub/)
  for (const literal of ['Nera', 'PROYECTOS', 'AGTECH', 'nera-agro.com']) {
    expect(markup).not.toContain(literal)
  }
})
