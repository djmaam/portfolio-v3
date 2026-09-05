import { afterEach, beforeEach, expect, test } from 'bun:test'

import { getTheme, setTheme, toggleTheme } from '../src/lib/theme'

const stub = (stored: string | null, prefersDark: boolean) => {
  const store = new Map<string, string>(stored === null ? [] : [['theme', stored]])
  const root = { style: { colorScheme: '' }, dataset: {} as Record<string, string> }
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
    matchMedia: (query: string) => ({ matches: prefersDark && query.includes('dark') }),
    document: { documentElement: root },
  })
  return { store, root }
}

beforeEach(() => stub(null, false))
afterEach(() => {
  for (const key of ['localStorage', 'matchMedia', 'document']) {
    delete (globalThis as Record<string, unknown>)[key]
  }
})

test('getTheme returns the stored theme when it is valid', () => {
  stub('dark', false)
  expect(getTheme()).toBe('dark')
  stub('light', true)
  expect(getTheme()).toBe('light')
})

test('getTheme falls back to prefers-color-scheme when nothing is stored', () => {
  stub(null, true)
  expect(getTheme()).toBe('dark')
  stub(null, false)
  expect(getTheme()).toBe('light')
})

test('getTheme falls back to prefers-color-scheme when the stored value is junk', () => {
  stub('DARK', true)
  expect(getTheme()).toBe('dark')
  stub('purple', false)
  expect(getTheme()).toBe('light')
})

test('setTheme persists and applies the theme to the document element', () => {
  const { store, root } = stub(null, false)
  setTheme('dark')
  expect(store.get('theme')).toBe('dark')
  expect(root.style.colorScheme).toBe('dark')
  expect(root.dataset.theme).toBe('dark')
})

test('toggleTheme flips the current theme and returns it', () => {
  const { root } = stub('light', false)
  expect(toggleTheme()).toBe('dark')
  expect(root.dataset.theme).toBe('dark')
  expect(toggleTheme()).toBe('light')
})

test('toggleTheme flips away from the system preference when nothing is stored', () => {
  stub(null, true)
  expect(toggleTheme()).toBe('light')
})
