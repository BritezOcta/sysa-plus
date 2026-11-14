import type { ReactNode } from 'react'
import { CANVAS_SLOT_KEYS } from '../../../constants'
import type { Subject, SubjectPeriod } from '../../../types'
import styles from '../CurriculumCanvas.module.css'

interface SubjectBankColumnProps {
  unassignedSubjects: Subject[]
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

export default function SubjectBankColumn({
  unassignedSubjects,
  activeDropSlotKey,
  draggedCardId,
  onSetActiveDropSlotKey,
  onMoveSubjectSlot,
  onCreateSubjectInSlot,
  renderSubjectCard,
}: SubjectBankColumnProps) {
  const isDragOver = activeDropSlotKey === CANVAS_SLOT_KEYS.BANK

  return (
    <section
      aria-label="Banco de materias sin asignar"
      onDragOver={(e) => {
        e.preventDefault()
        if (!isDragOver) onSetActiveDropSlotKey(CANVAS_SLOT_KEYS.BANK)
      }}
      onDragLeave={() => onSetActiveDropSlotKey(null)}
      onDrop={(e) => {
        e.preventDefault()
        onSetActiveDropSlotKey(null)
        const subjId =
          draggedCardId || e.dataTransfer.getData('text/plain')
        if (subjId) {
          onMoveSubjectSlot(subjId, null, null)
        }
      }}
      className={`${styles.bankColumn} ${
        isDragOver ? styles.slotDragOver : ''
      }`}
    >
      <div className={styles.bankHeader}>
        <div>
          <h3>Banco de materias ({unassignedSubjects.length})</h3>
          <span className={styles.bankSub}>Pendientes de ubicación</span>
        </div>
        <button
          type="button"
          onClick={() => onCreateSubjectInSlot(null, null)}
          className={styles.slotAddBtn}
          aria-label="Crear materia sin asignar en el banco"
        >
          + Nueva
        </button>
      </div>

      <p className={styles.bankHint}>
        Arrastrá materias hacia un cuatrimestre o editálas con ✎ para asignarles
        ubicación.
      </p>

      <div className={styles.slotCardsStack}>
        {unassignedSubjects.map((subj) => renderSubjectCard(subj))}
        {unassignedSubjects.length === 0 && (
          <div className={styles.emptySlotBox}>
            Todas las materias están ubicadas en el plan.
          </div>
        )}
      </div>
    </section>
  )
}
