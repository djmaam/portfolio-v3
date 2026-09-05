import js from '@eslint/js'
import astro from 'eslint-plugin-astro'
import ts from 'typescript-eslint'

// ponytail: typescript is pinned to ^6.0.3 in package.json because typescript-eslint
// does not support TS 7 yet (peer: >=4.8.4 <6.1.0). Move to TS 7 once it does, or drop
// typescript-eslint and rely on `astro check` + TS strict alone.

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'handoff/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
]
