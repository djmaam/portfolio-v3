import { expect, test } from 'bun:test'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const script = new URL('../scripts/check-tokens.ts', import.meta.url).pathname

/** Writes `files` into a throwaway directory and runs the checker over it. */
const check = async (files: Record<string, string>) => {
  const dir = await mkdtemp(join(tmpdir(), 'check-tokens-'))
  for (const [name, content] of Object.entries(files)) {
    await mkdir(join(dir, name, '..'), { recursive: true })
    await writeFile(join(dir, name), content)
  }
  const proc = Bun.spawn(['bun', script, dir], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { exitCode, output: stdout + stderr }
}

test('passes on a file that only uses tokens', async () => {
  const { exitCode } = await check({
    'components/Card.astro': '<div style="color: var(--color-ink)">hola</div>\n',
  })
  expect(exitCode).toBe(0)
})

test('fails on a hex literal and reports file, line and colour', async () => {
  const { exitCode, output } = await check({
    'components/Card.astro': 'ok\n<div style="color: #3EE7FF">hola</div>\n',
  })
  expect(exitCode).not.toBe(0)
  expect(output).toContain('components/Card.astro')
  expect(output).toContain(':2')
  expect(output).toContain('#3EE7FF')
})

test.each(['#abc', '#0B0D12', '#3EE7FF80', 'rgb(1,2,3)', 'rgba(1,2,3,.5)', 'hsl(1 2% 3%)'])(
  'rejects %s',
  async (color) => {
    const { exitCode } = await check({ 'lib/x.ts': `export const c = '${color}'\n` })
    expect(exitCode).not.toBe(0)
  },
)

test('app.css is the one file allowed to hold literal colours', async () => {
  const { exitCode } = await check({
    'styles/app.css': '@theme { --color-ink: light-dark(#0B0D12, #F3F5F9); }\n',
  })
  expect(exitCode).toBe(0)
})

test('the real src/ tree is clean', async () => {
  const proc = Bun.spawn(['bun', script], {
    cwd: new URL('../', import.meta.url).pathname,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [output, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
  expect(output).toBe('')
  expect(exitCode).toBe(0)
})
