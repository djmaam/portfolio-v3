import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'bun:test'

import { content, LANGS } from '../src/lib/content'
import { PREVIEWS, previewMode, projectDelay, projectUrl, URL_OVERRIDES } from '../src/lib/projects'

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

test('the Telecentro URL resolves to the product the owner built, not the root', () => {
  expect(projectUrl('telecentro.com.ar', 'https://telecentro.com.ar/')).toBe(
    'https://telecentro.com.ar/t-play',
  )
})

test('every other project falls back to its own content.json URL', () => {
  for (const project of content.es.projects) {
    if (project.host === 'telecentro.com.ar') continue
    expect(projectUrl(project.host, project.url)).toBe(project.url)
  }
})

test('the URL override is keyed by host, so reordering content.json cannot swap it', () => {
  const forward = content.es.projects.map((project) => projectUrl(project.host, project.url))
  const reversed = [...content.es.projects]
    .reverse()
    .map((project) => projectUrl(project.host, project.url))

  expect(reversed).toEqual([...forward].reverse())
  expect(Object.keys(URL_OVERRIDES).every((key) => Number.isNaN(Number(key)))).toBe(true)
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

test('the card href resolves through the same host-keyed override as the preview', () => {
  expect(frontmatter).toMatch(/from '\.\.\/lib\/projects'/)
  expect(markup).toMatch(/href=\{projectUrl\(project\.host, project\.url\)\}/)
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

test('the shimmer band rests offscreen-left, not clipped inside the frame', () => {
  // `left: 0` plus a rest-state `translateX(-100%)` is the geometry that keeps the band
  // fully offscreen whether or not the animation is running (PV3-29): `left: -40%` used to
  // double-count the offset and land the travelling band on the frame's right edge.
  const [, shimmerBlock = ''] = /\.shimmer\s*\{([\s\S]*?)\}/.exec(styles) ?? []
  expect(shimmerBlock).toMatch(/left:\s*0/)
  expect(shimmerBlock).toMatch(/width:\s*40%/)
  expect(shimmerBlock).toMatch(/transform:\s*translateX\(-120%\)\s*skewX\(-12deg\)/)
  expect(shimmerBlock).toMatch(/color-mix\(in srgb, var\(--color-accent\) 12%, transparent\)/)
})

test('the shimmer keyframes travel from fully offscreen-left to fully offscreen-right', async () => {
  // `MOTION_SPEC` §9 says `translateX(-100% → 250%)`, but that treats the band as an
  // axis-aligned box. `skewX(-12deg)` shears it into a parallelogram whose rendered
  // bounding box is wider than its layout width by `height * tan(12deg)`, split across
  // both edges — at exactly -100%/250% the sheared corners still poke ~18% of the band's
  // own width into the frame at each loop endpoint (PV3-29's e2e test caught this). -120%
  // and 270% clear that shear with a small margin to spare, still fully inside the
  // "enters from the left, travels across, exits right" motion the spec describes.
  const appCss = await Bun.file(new URL('../src/styles/app.css', import.meta.url)).text()
  const [, keyframes = ''] = /@keyframes shimmer\s*\{([\s\S]*?)\n\}/.exec(appCss) ?? []
  expect(keyframes).toMatch(/from\s*\{\s*transform:\s*translateX\(-120%\)\s*skewX\(-12deg\)/)
  expect(keyframes).toMatch(/to\s*\{\s*transform:\s*translateX\(270%\)\s*skewX\(-12deg\)/)
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
