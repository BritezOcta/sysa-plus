import { useId, useRef, type CSSProperties } from 'react'
import { Icon } from '../components/Icon'
import { handleDialogTrapKeyDown, useDialogFocusTrap } from '../hooks'
import { useAccessibility } from './AccessibilityContext'
import {
  TEXT_SCALES,
  type AccessibilitySettings,
  type FontChoice,
  type SpacingLevel,
} from './accessibilitySettings'
import styles from './AccessibilityMenu.module.css'

interface Option<T> {
  value: T
  label: string
  style?: CSSProperties
}

const FONT_OPTIONS: Option<FontChoice>[] = [
  { value: 'default', label: 'Predeterminada' },
  { value: 'legible', label: 'Legible', style: { fontFamily: '"Atkinson Hyperlegible", Verdana, sans-serif' } },
  { value: 'dyslexic', label: 'Dislexia', style: { fontFamily: '"OpenDyslexic", Verdana, sans-serif' } },
]

const LINE_HEIGHT_OPTIONS: Option<SpacingLevel>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Media' },
  { value: 'large', label: 'Amplia' },
]

const LETTER_SPACING_OPTIONS: Option<SpacingLevel>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Medio' },
  { value: 'large', label: 'Amplio' },
]

const SCALE_OPTIONS = TEXT_SCALES.map((v) => ({ value: v, label: `${v}%` }))

type ToggleKey = 'highContrast' | 'highlightLinks' | 'reduceMotion'

const TOGGLES: { key: ToggleKey; label: string; hint: string }[] = [
  { key: 'highContrast', label: 'Alto contraste', hint: 'Refuerza textos, bordes y fondos.' },
  { key: 'highlightLinks', label: 'Resaltar enlaces y botones', hint: 'Subraya enlaces y marca los elementos interactivos.' },
  { key: 'reduceMotion', label: 'Reducir animaciones', hint: 'Desactiva transiciones y movimientos.' },
]

/** Grupo de opciones con radios nativos (flechas para moverse, Tab para salir del grupo). */
function Segmented<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string
  name: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.segmented}>
        {options.map((o) => (
          <label key={o.value} className={styles.segment}>
            <input
              type="radio"
              className={styles.segmentInput}
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className={styles.segmentLabel} style={o.style}>
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

interface Props {
  onClose: () => void
}

/** Panel lateral de preferencias de accesibilidad. Los cambios se aplican al instante. */
export function AccessibilityMenu({ onClose }: Props) {
  const { settings, updateSetting, resetSettings } = useAccessibility()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  const titleId = `${id}-title`

  useDialogFocusTrap(panelRef, closeBtnRef)

  const set =
    <K extends keyof AccessibilitySettings>(key: K) =>
    (value: AccessibilitySettings[K]) =>
      updateSetting(key, value)

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => handleDialogTrapKeyDown(e, panelRef.current, onClose)}
      >
        <header className={styles.header}>
          <Icon name="accessibility" size={24} />
          <div className={styles.headerText}>
            <h2 id={titleId} className={styles.title}>
              Accesibilidad
            </h2>
            <p className={styles.subtitle}>Los cambios se aplican al instante y se guardan en este navegador.</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar opciones de accesibilidad"
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className={styles.body}>
          <Segmented
            legend="Tamaño de texto"
            name={`${id}-scale`}
            options={SCALE_OPTIONS}
            value={settings.textScale}
            onChange={set('textScale')}
          />
          <Segmented
            legend="Tipografía"
            name={`${id}-font`}
            options={FONT_OPTIONS}
            value={settings.font}
            onChange={set('font')}
          />
          <Segmented
            legend="Altura de línea"
            name={`${id}-line`}
            options={LINE_HEIGHT_OPTIONS}
            value={settings.lineHeight}
            onChange={set('lineHeight')}
          />
          <Segmented
            legend="Espaciado entre letras"
            name={`${id}-letter`}
            options={LETTER_SPACING_OPTIONS}
            value={settings.letterSpacing}
            onChange={set('letterSpacing')}
          />

          <div className={styles.toggles}>
            {TOGGLES.map((t) => (
              <label key={t.key} className={styles.toggle}>
                <span className={styles.toggleText}>
                  <span className={styles.toggleLabel}>{t.label}</span>
                  <span className={styles.toggleHint}>{t.hint}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.switchInput}
                  checked={settings[t.key]}
                  onChange={(e) => updateSetting(t.key, e.target.checked)}
                />
                <span className={styles.switchTrack} aria-hidden="true" />
              </label>
            ))}
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.resetBtn} onClick={resetSettings}>
            Restablecer todo
          </button>
        </footer>
      </div>
    </div>
  )
}
