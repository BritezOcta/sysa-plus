import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'sysaplus-theme'

function readStored(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* localStorage no disponible */
  }
  return 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStored)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* ignorar */
    }
  }, [theme])

  const toggle = useCallback(
    () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    [],
  )

  return { theme, toggle }
}
