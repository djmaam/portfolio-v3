import js from '@eslint/js'
import astro from 'eslint-plugin-astro'
import ts from 'typescript-eslint'

// ponytail: typescript queda pineado en ^6.0.3 en package.json porque typescript-eslint
// todavía no soporta TS 7 (peer: >=4.8.4 <6.1.0). Subir a TS 7 cuando lo soporte,
// o quitar typescript-eslint y apoyarse solo en `astro check` + TS strict.

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'handoff/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
]
