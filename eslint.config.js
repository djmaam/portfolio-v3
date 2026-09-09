import js from '@eslint/js'
import astro from 'eslint-plugin-astro'
import ts from 'typescript-eslint'

// ponytail: typescript is pinned to ^6.0.3 in package.json because typescript-eslint
// does not support TS 7 yet (peer: >=4.8.4 <6.1.0). Move to TS 7 once it does, or drop
// typescript-eslint and rely on `astro check` + TS strict alone.

export default [
  // `.claude/worktrees/*` holds throwaway agent worktrees, each with its own
  // tsconfig.json. Left visible, typescript-eslint sees several candidate roots and
  // refuses to parse anything.
  {
    ignores: [
      'dist/',
      '.astro/',
      'node_modules/',
      'handoff/',
      '.claude/',
      'test-results/',
      'playwright-report/',
      '.lighthouseci/',
      // Not site source: a one-off banner generator that runs in Node with Playwright.
      'assets/',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
]
