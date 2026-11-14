import { CORRELATIVITY_TYPES } from '../../../constants'
import type { CorrelativityType, Subject } from '../../../types'
import styles from '../CurriculumCanvas.module.css'

interface CanvasToolbarProps {
  simMode: boolean
  activeWireType: CorrelativityType
  pinnedSubject: Subject | undefined
  showAllCables: boolean
  showGuide: boolean
  onSelectWireType: (type: CorrelativityType) => void
  onApproveFirstYear: () => void
  onResetSimulation: () => void
  onClearPinnedSubject: () => void
  onToggleShowAllCables: (show: boolean) => void
  onToggleShowGuide: () => void
  onToggleSimMode: () => void
}

const WIRE_MODE_OPTIONS = [
  {
    type: CORRELATIVITY_TYPES.REGULAR_TO_ENROLL,
    label: 'Regularizada p/ cursar',
    dotClass: styles.dotAmber,
  },
  {
    type: CORRELATIVITY_TYPES.APPROVED_TO_ENROLL,
    label: 'Aprobada p/ cursar',
    dotClass: styles.dotBlue,
  },
  {
    type: CORRELATIVITY_TYPES.APPROVED_FOR_EXAM,
    label: 'Aprobada p/ rendir final',
    dotClass: styles.dotGreen,
  },
] as const

export default function CanvasToolbar({
  simMode,
  activeWireType,
  pinnedSubject,
  showAllCables,
  showGuide,
  onSelectWireType,
  onApproveFirstYear,
  onResetSimulation,
  onClearPinnedSubject,
  onToggleShowAllCables,
  onToggleShowGuide,
  onToggleSimMode,
}: CanvasToolbarProps) {
  return (
    <div className={styles.canvasToolbar}>
      <div className={styles.toolbarLeft}>
        {!simMode ? (
          <div
            className={styles.wireModeSelector}
            role="group"
            aria-label="Condición de correlatividad al conectar"
          >
            <span className={styles.toolbarLabel}>Condición al conectar:</span>
            {WIRE_MODE_OPTIONS.map((item) => (
              <button
                key={item.type}
                type="button"
                aria-pressed={activeWireType === item.type}
                onClick={() => onSelectWireType(item.type)}
                className={`${styles.wireTypeBtn} ${
                  activeWireType === item.type ? styles.wireTypeBtnActive : ''
                }`}
              >
                <span
                  className={`${styles.colorDot} ${item.dotClass}`}
                  aria-hidden="true"
                />
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.simToolbarInfo}>
            <span className={styles.simPulseBadge}>
              Simulador de inscripción de alumno
            </span>
            <p>
              Seleccioná cualquier materia para alternar su estado (
              <strong>Pendiente ➔ Regularizada ➔ Aprobada</strong>) y comprobar
              qué cursadas se habilitan.
            </p>
            <button
              type="button"
              className={styles.simQuickBtn}
              onClick={onApproveFirstYear}
            >
              Aprobar todo 1° Año
            </button>
            <button
              type="button"
              className={styles.simQuickBtn}
              onClick={onResetSimulation}
            >
              Reiniciar simulación
            </button>
          </div>
        )}
      </div>

      <div className={styles.toolbarRight}>
        {pinnedSubject && !simMode && (
          <button
            type="button"
            onClick={onClearPinnedSubject}
            className={styles.clearFocusBtn}
          >
            ✕ Quitar foco ({pinnedSubject.code})
          </button>
        )}

        <label className={styles.toggleCablesLabel}>
          <input
            type="checkbox"
            checked={showAllCables}
            onChange={(e) => onToggleShowAllCables(e.target.checked)}
          />
          <span>Mostrar todas las conexiones</span>
        </label>

        <button
          type="button"
          aria-expanded={showGuide}
          aria-controls="canvas-usage-guide"
          onClick={onToggleShowGuide}
          className={`${styles.guideToggleBtn} ${
            showGuide ? styles.guideToggleBtnActive : ''
          }`}
        >
          {showGuide ? 'Ocultar guía' : '? Cómo usar'}
        </button>

        <button
          type="button"
          aria-pressed={simMode}
          onClick={onToggleSimMode}
          className={`${styles.simToggleBtn} ${
            simMode ? styles.simToggleBtnActive : ''
          }`}
        >
          {simMode ? 'Volver a edición curricular' : 'Simulador de alumno'}
        </button>
      </div>
    </div>
  )
}
