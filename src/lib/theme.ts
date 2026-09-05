export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

/** El tema elegido en localStorage; si no hay uno válido, el del sistema. */
export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (isTheme(stored)) return stored
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Persiste el tema y lo aplica al <html>, igual que el script inline del <head>. */
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
