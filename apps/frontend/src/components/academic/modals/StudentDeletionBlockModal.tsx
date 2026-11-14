import { useRef } from 'react'
import type { Subject } from '../../../types'
import ModalShell from '../../ui/ModalShell'
import styles from '../Modals.module.css'

interface StudentDeletionBlockModalProps {
  subject: Subject
  onClose: () => void
  onInactivateInstead: (subject: Subject) => void
}

export default function StudentDeletionBlockModal({
  subject,
  onClose,
  onInactivateInstead,
}: StudentDeletionBlockModalProps) {
  const inactivateBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <ModalShell
      titleId="student-block-title"
      describedById="student-block-desc"
      title="Eliminación bloqueada por alumnos inscriptos"
      subtitle="Protección de integridad académica del plan de estudios"
      closeAriaLabel="Cerrar aviso de bloqueo"
      tone="warning"
      role="alertdialog"
      initialFocusRef={inactivateBtnRef}
      onRequestClose={onClose}
    >
      <div className={styles.formBody}>
        <div className={styles.warningHero} id="student-block-desc">
          <div className={styles.warningIconCircle} aria-hidden="true">
            !
          </div>
          <div>
            <p className={styles.warningLead}>
              No es posible eliminar físicamente la materia{' '}
              <strong>
                {subject.code} — {subject.name}
              </strong>{' '}
              porque registra{' '}
              <span className={styles.studentCountHighlight}>
                {subject.enrolledStudents} alumnos cursando o inscriptos
              </span>{' '}
              en el ciclo lectivo actual.
            </p>
            <p className={styles.warningSub}>
              Para preservar las actas de cursada, asistencias e inscripciones
              históricas, podés <strong>inactivar la materia</strong> en lugar
              de eliminarla.
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            ref={inactivateBtnRef}
            type="button"
            className={styles.amberBtn}
            onClick={() => onInactivateInstead(subject)}
          >
            Inactivar "{subject.code}" en su lugar
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
