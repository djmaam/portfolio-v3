import { expect, test } from 'bun:test'

import { consoleChrome } from '../src/lib/ui'

/**
 * The console is DOM plumbing, so what the unit tests guard is the shape of its markup:
 * the three things that are silently wrong if they regress — a server-rendered clock, an
 * `aria-live` that would announce a line every 1.4s forever, and copy typed by hand.
 */
const source = await Bun.file(new URL('../src/components/Console.astro', import.meta.url)).text()
const [, frontmatter = '', body = ''] = /^---([\s\S]*?)^---([\s\S]*)$/m.exec(source) ?? []
/** What the server actually renders: the body without the client-side `<script>`. */
const markup = body.replace(/<script[\s\S]*?<\/script>/g, '')

test('the log is a log that announces nothing', () => {
  // `aria-live="polite"` is right for the interactive console of v1.1; here the log
  // cycles forever with no user input, so it must stay silent (spec 06 §7).
  expect(markup).toMatch(/role="log"/)
  expect(markup).toMatch(/aria-live="off"/)
  expect(markup).not.toMatch(/aria-live="polite"/)
})

test('no timestamp is ever server-rendered', () => {
  // A static build would freeze one clock into the HTML forever: the time cells ship
  // empty and JavaScript fills them.
  expect(markup).not.toMatch(/\d\d:\d\d:\d\d/)
  expect(`${frontmatter}\n${markup}`).not.toMatch(/Date|toTimeString|toLocaleTimeString/)
})

test('the chrome copy comes from ui.ts and the log from content.json', () => {
  expect(markup).toContain('consoleChrome.session')
  expect(markup).not.toContain('orchestrator')
  expect(markup).not.toMatch(/>\s*LIVE\s*</)
  expect(markup).not.toMatch(/AGENTS|SPECS|SHIPPED/)
  expect(frontmatter).toMatch(/consoleLog\D+from '\.\.\/lib\/content'/)
})

test('the console chrome names the session and the three metrics of the design', () => {
  expect(consoleChrome.session).toBe('orchestrator — session 0x4D41')
  expect(consoleChrome.live).toBe('LIVE')
  expect(consoleChrome.metrics.map((metric) => metric.label)).toEqual([
    'AGENTS',
    'SPECS',
    'SHIPPED',
  ])
})
