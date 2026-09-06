import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'bun:test'

import { content, LANGS } from '../src/lib/content'
import { PREVIEWS, previewMode, projectDelay } from '../src/lib/projects'

const hosts = LANGS.flatMap((lang) => content[lang].projects.map((project) => project.host))

test('every project in content.json has a declared preview mode', () => {
  for (const host of hosts) expect(PREVIEWS[host]).toBeDefined()
})

test('every project is a screenshot, and its image exists', () => {
  for (const project of content.es.projects) {
    expect(previewMode(project.host)).toBe('screenshot')
    expect(existsSync(join(process.cwd(), 'public', 'previews', `${project.host}.jpg`))).toBe(true)
  }
})

test('the mode is keyed by host, so reordering content.json cannot swap it', () => {
  // The table is read by host, never by position: the reversed list yields the same
  // modes, which is what keeps an iframe off a site that answers `X-Frame-Options`.
  const forward = content.es.projects.map((project) => previewMode(project.host))
  const reversed = [...content.es.projects].reverse().map((project) => previewMode(project.host))

  expect(reversed).toEqual([...forward].reverse())
  expect(Object.keys(PREVIEWS).every((key) => Number.isNaN(Number(key)))).toBe(true)
})

test('a host nobody declared still falls back to a screenshot', () => {
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

test('exactly one image is written, behind the resolved screenshot', () => {
  expect(markup.match(/<img/g)).toHaveLength(1)
  // A project whose file is missing renders no <img> at all, so the striped placeholder
  // of the box shows through instead of a broken-image icon.
  expect(markup).toMatch(/project\.shot &&[\s\S]*?<img/)
})

test('the preview image is lazy, decorative and deaf to the pointer', () => {
  const [, img = ''] = /<img([\s\S]*?)\/>/.exec(markup) ?? []
  expect(img).toMatch(/loading="lazy"/)
  expect(img).toMatch(/alt=""/)
  // A tab stop or an accessible name over a decorative preview is the a11y bug this
  // guards; `alt=""` keeps it out of the tree and the frame ignores the pointer.
  expect(styles).toMatch(/\.frame \{[^}]*pointer-events: none/)
})

test('no iframe survives: the previews are static files, not live embeds', () => {
  // Four live cross-origin embeds pulled 40-50 third-party requests into the page and
  // cost the budget of spec 17. Nothing should quietly bring them back.
  expect(markup).not.toMatch(/<iframe/)
  expect(body).not.toMatch(/IntersectionObserver/)
})

test('the screenshot falls back to the striped placeholder while the files are missing', () => {
  expect(frontmatter).toMatch(/existsSync/)
  expect(frontmatter).toMatch(/previews\/\$\{project\.host\}\.jpg/)
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
