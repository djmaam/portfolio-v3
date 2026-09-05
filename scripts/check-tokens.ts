#!/usr/bin/env bun
// Ningún color literal fuera de src/styles/app.css: los componentes solo consumen
// tokens (`text-ink`, `bg-bg`, `var(--color-*)`). Corre desde `bun run lint`.

import { Glob } from 'bun'
import { relative, resolve } from 'node:path'

const LITERAL_COLOR = /#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b|\b(?:rgba?|hsla?)\(/gi
const ALLOWED = 'src/styles/app.css'

const root = resolve(process.argv[2] ?? 'src')
const findings: string[] = []

for await (const file of new Glob('**/*.{astro,ts,tsx,js,jsx,css,svelte,vue}').scan(root)) {
  if (file.endsWith('styles/app.css')) continue
  const path = resolve(root, file)
  const lines = (await Bun.file(path).text()).split('\n')
  lines.forEach((line, index) => {
    for (const [color] of line.matchAll(LITERAL_COLOR)) {
      findings.push(`${relative(process.cwd(), path)}:${index + 1}  ${color}`)
    }
  })
}

if (findings.length > 0) {
  console.error(`Colores literales fuera de ${ALLOWED} (usá tokens de @theme):\n`)
  console.error(findings.join('\n'))
  process.exit(1)
}
