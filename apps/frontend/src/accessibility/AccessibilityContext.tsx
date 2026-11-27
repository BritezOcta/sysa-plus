import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { UI_STORAGE_KEYS } from '../constants'
import {
  DEFAULT_ACCESSIBILITY_SETTINGS,
  FONT_CHOICES,
  SPACING_LEVELS,
  TEXT_SCALES,
  type AccessibilitySettings,
} from './accessibilitySettings'

interface AccessibilityContextValue {
  settings: AccessibilitySettings
  updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void
  /** Vuelve a los valores predeterminados y borra la configuración guardada. */
  resetSettings: () => void
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

/** Lee lo guardado descartando valores inválidos (p. ej. de una versión anterior). */
function readStored(): AccessibilitySettings {
  const d = DEFAULT_ACCESSIBILITY_SETTINGS
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEYS.ACCESSIBILITY)
    if (!raw) return d
    const s = JSON.parse(raw) as Partial<Record<keyof AccessibilitySettings, unknown>>
    const pick = <T,>(value: unknown, allowed: readonly T[], fallback: T): T =>
      allowed.includes(value as T) ? (value as T) : fallback
    const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
    return {
      textScale: pick(s.textScale, TEXT_SCALES, d.textScale),
      font: pick(s.font, FONT_CHOICES, d.font),
      lineHeight: pick(s.lineHeight, SPACING_LEVELS, d.lineHeight),
      letterSpacing: pick(s.letterSpacing, SPACING_LEVELS, d.letterSpacing),
      highContrast: bool(s.highContrast, d.highContrast),
      highlightLinks: bool(s.highlightLinks, d.highlightLinks),
      reduceMotion: bool(s.reduceMotion, d.reduceMotion),
    }
  } catch {
    /* localStorage no disponible o JSON inválido */
    return d
  }
}

/** Refleja las preferencias en <html> para que accessibility.css las aplique. */
function applyToDocument(s: AccessibilitySettings) {
  const root = document.documentElement
  root.style.setProperty('--a11y-text-scale', String(s.textScale / 100))
  root.dataset.a11yTextScale = String(s.textScale)
  root.dataset.a11yFont = s.font
  root.dataset.a11yLineHeight = s.lineHeight
  root.dataset.a11yLetterSpacing = s.letterSpacing
  root.dataset.a11yContrast = s.highContrast ? 'high' : 'normal'
  root.dataset.a11yHighlightLinks = String(s.highlightLinks)
  root.dataset.a11yReduceMotion = String(s.reduceMotion)
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(readStored)

  // Layout effect: se aplica antes del primer pintado, sin parpadeo de estilos.
  useLayoutEffect(() => {
    applyToDocument(settings)
  }, [settings])

  const updateSetting = useCallback<AccessibilityContextValue['updateSetting']>((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      try {
        localStorage.setItem(UI_STORAGE_KEYS.ACCESSIBILITY, JSON.stringify(next))
      } catch {
        /* ignorar */
      }
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    try {
      localStorage.removeItem(UI_STORAGE_KEYS.ACCESSIBILITY)
    } catch {
      /* ignorar */
    }
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS)
  }, [])

  const value = useMemo(
    () => ({ settings, updateSetting, resetSettings }),
    [settings, updateSetting, resetSettings],
  )

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility debe usarse dentro de <AccessibilityProvider>')
  return ctx
}
