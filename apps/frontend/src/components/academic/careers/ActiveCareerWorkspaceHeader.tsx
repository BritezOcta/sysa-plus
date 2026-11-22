import { VIEW_MODES } from '../../../constants'
import styles from '../../../pages/AcademicManagementPage.module.css'
import type { Career, ViewMode } from '../../../types'

interface ActiveCareerWorkspaceHeaderProps {
  activeCareer: Career
  viewMode: ViewMode
  onChangeViewMode: (mode: ViewMode) => void
  onCreateSubject: () => void
}

export default function ActiveCareerWorkspaceHeader({
  activeCareer,
  viewMode,
  onChangeViewMode,
  onCreateSubject,
}: ActiveCareerWorkspaceHeaderProps) {
  return (
    <div className={styles.workspaceBar}>
      <div className={styles.activeCareerSummary}>
        <div className={styles.activeTitleLine}>
          <span className={styles.activeCodeTag}>{activeCareer.code}</span>
          <h2 id="active-career-heading">{activeCareer.name}</h2>
          <span className={styles.planPill}>
            {activeCareer.studyPlan} · {activeCareer.durationYears} años
          </span>
        </div>
        <p className={styles.activeCareerDesc}>{activeCareer.description}</p>
      </div>

      <div className={styles.workspaceRightControls}>
        <div
          className={styles.viewTabs}
          role="group"
          aria-label="Modo de visualización del plan de estudios"
        >
          <button
            type="button"
            aria-pressed={viewMode === VIEW_MODES.CANVAS}
            onClick={() => onChangeViewMode(VIEW_MODES.CANVAS)}
            className={`${styles.viewTabBtn} ${
              viewMode === VIEW_MODES.CANVAS ? styles.viewTabActive : ''
            }`}
          >
            Mapa de correlatividades
          </button>
          <button
            type="button"
            aria-pressed={viewMode === VIEW_MODES.TABLE}
            onClick={() => onChangeViewMode(VIEW_MODES.TABLE)}
            className={`${styles.viewTabBtn} ${
              viewMode === VIEW_MODES.TABLE ? styles.viewTabActive : ''
            }`}
          >
            Tabla del plan de estudios
          </button>
        </div>

        <button
          type="button"
          className={styles.addSubjectHeroBtn}
          onClick={onCreateSubject}
        >
          + Nueva materia
        </button>
      </div>
    </div>
  )
}
