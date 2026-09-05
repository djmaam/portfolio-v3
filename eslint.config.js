import js from '@eslint/js'
import astro from 'eslint-plugin-astro'
import ts from 'typescript-eslint'

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'handoff/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
]
