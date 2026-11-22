import type { ReactNode } from 'react'
import {
  ACADEMIC_PERIOD_COLUMNS,
  CANVAS_SLOT_KEYS,
  SUBJECT_PERIODS,
} from '../../../constants'
import type { Subject, SubjectPeriod } from '../../../types'
import styles from '../CurriculumCanvas.module.css'

interface AcademicYearColumnProps {
  year: number
  subjects: Subject[]
  activeDropSlotKey: string | null
  draggedCardId: string | null
  onSetActiveDropSlotKey: (key: string | null) => void
  onMoveSubjectSlot: (
    subjectId: string,
    targetYear: number | null,
    targetPeriod: SubjectPeriod | null,
  ) => void
  onCreateSubjectInSlot: (
    year: number | null,
    period: SubjectPeriod | null,
  ) => void
  renderSubjectCard: (subject: Subject) => ReactNode
}

export default function AcademicYearColumn({
  year,
  subjects,
  activeDropSlotKey,
  draggedCardId,
  onSetActiveDropSlotKey,
  onMoveSubjectSlot,
  onCreateSubjectInSlot,
  renderSubjectCard,
}: AcademicYearColumnProps) {
  const anualSubjects = subjects.filter(
    (s) => s.year === year && s.period === SUBJECT_PERIODS.ANNUAL,
  )

  return (
    <div className={styles.yearGroup}>
      <div className={styles.yearGroupHeader}>
        <h3 className={styles.yearBadge}>{year}° Año del plan</h3>
        <button
          type="button"
          onClick={() => onCreateSubjectInSlot(year, SUBJECT_PERIODS.ANNUAL)}
          className={styles.yearAnualAddBtn}
          aria-label={`Crear materia anual en ${year}° Año`}
        >
          + Materia anual
        </button>
      </div>

      <div className={styles.periodsGrid}>
        {ACADEMIC_PERIOD_COLUMNS.map(({ period, title }) => {
          const slotKey = CANVAS_SLOT_KEYS.buildPeriodSlotKey(year, period)
          const slotSubjects = subjects.filter(
            (s) =>
              s.year === year &&
              (s.period === period ||
                (period === SUBJECT_PERIODS.FIRST &&
                  s.period === SUBJECT_PERIODS.ANNUAL)),
          )

          return (
            <section
              key={slotKey}
              aria-label={`${year}° Año, ${title}`}
              onDragOver={(e) => {
                e.preventDefault()
                if (activeDropSlotKey !== slotKey) {
                  onSetActiveDropSlotKey(slotKey)
                }
              }}
              onDragLeave={() => onSetActiveDropSlotKey(null)}
              onDrop={(e) => {
                e.preventDefault()
                onSetActiveDropSlotKey(null)
                const subjId =
                  draggedCardId || e.dataTransfer.getData('text/plain')
                if (subjId) {
                  onMoveSubjectSlot(subjId, year, period)
                }
              }}
              className={`${styles.periodColumn} ${
                activeDropSlotKey === slotKey ? styles.slotDragOver : ''
              }`}
            >
              <div className={styles.periodHeader}>
                <div>
                  <h4>
                    {year}° Año · {title}
                  </h4>
                  <span>{slotSubjects.length} materias</span>
                </div>
                <button
                  type="button"
                  onClick={() => onCreateSubjectInSlot(year, period)}
                  className={styles.slotAddBtn}
                  aria-label={`Crear materia en ${year}° Año ${title}`}
                >
                  + Alta
                </button>
              </div>

              <div className={styles.slotCardsStack}>
                {slotSubjects.map((subj) => renderSubjectCard(subj))}

                {slotSubjects.length === 0 && (
                  <div className={styles.emptySlotBox}>
                    Soltá una materia acá o usá <strong>+ Alta</strong>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {anualSubjects.length > 0 && (
        <div className={styles.anualNotice}>
          Incluye {anualSubjects.length} materia(s) de régimen anual.
        </div>
      )}
    </div>
  )
}
