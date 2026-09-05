export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

/** The theme stored in localStorage; falls back to the system one. */
export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (isTheme(stored)) return stored
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Persists the theme and applies it to <html>, like the inline script in <head>. */
export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
  const root = document.documentElement
  root.style.colorScheme = theme
  root.dataset.theme = theme
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
