import { ENTITY_STATUS } from '../../../constants'
import { AcademicFormatHelper } from '../../../helpers'
import type { Correlativity, Subject } from '../../../types'
import StatusPill from '../../ui/StatusPill'
import styles from '../CurriculumTableView.module.css'

interface CurriculumTableRowProps {
  subject: Subject
  requirements: Correlativity[]
  unlocks: Correlativity[]
  subjectMap: Map<string, Subject>
  onEditSubject: (subject: Subject) => void
  onToggleSubjectStatus: (subject: Subject) => void
  onDeleteSubject: (subject: Subject) => void
  onRemoveCorrelativity: (correlativityId: string) => void
}

export default function CurriculumTableRow({
  subject,
  requirements,
  unlocks,
  subjectMap,
  onEditSubject,
  onToggleSubjectStatus,
  onDeleteSubject,
  onRemoveCorrelativity,
}: CurriculumTableRowProps) {
  const isActive = subject.status === ENTITY_STATUS.ACTIVE

  return (
    <tr className={!isActive ? styles.rowInactive : ''}>
      <td>
        <span className={styles.codeBadge}>{subject.code}</span>
      </td>
      <td>
        <strong className={styles.subjName}>{subject.name}</strong>
      </td>
      <td>
        <span
          className={
            subject.year === null ? styles.bankBadge : styles.periodBadge
          }
        >
          {AcademicFormatHelper.formatPeriodLabel(subject.year, subject.period)}
        </span>
      </td>
      <td>
        <div className={styles.hoursCell}>
          <strong>{subject.weeklyHours} hs/sem</strong>
          <span>{subject.totalHours} hs totales</span>
        </div>
      </td>
      <td>
        {requirements.length === 0 ? (
          <span className={styles.noReqs}>
            Sin correlativas (ingreso directo)
          </span>
        ) : (
          <div className={styles.corrPillsWrap}>
            {requirements.map((req) => {
              const prereq = subjectMap.get(req.requiresSubjectId)
              const meta = AcademicFormatHelper.formatCorrelativityTypeLabel(
                req.type,
              )
              if (!prereq) return null
              return (
                <span
                  key={req.id}
                  className={`${styles.corrPill} ${styles[`pill_${req.type}`]}`}
                  title={`${prereq.name} — ${meta.full}`}
                >
                  <strong>{prereq.code}</strong>
                  <em>{meta.short}</em>
                  <button
                    type="button"
                    onClick={() => onRemoveCorrelativity(req.id)}
                    aria-label={`Eliminar correlatividad ${prereq.code} (${meta.short}) de ${subject.code} ${subject.name}`}
                  >
                    ✕
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </td>
      <td>
        {unlocks.length === 0 ? (
          <span className={styles.noReqs}>Ninguna</span>
        ) : (
          <div className={styles.corrPillsWrap}>
            {unlocks.map((u) => {
              const nextSubj = subjectMap.get(u.subjectId)
              if (!nextSubj) return null
              return (
                <span
                  key={u.id}
                  className={styles.unlockPill}
                  title={nextSubj.name}
                >
                  ➔ {nextSubj.code}
                </span>
              )
            })}
          </div>
        )}
      </td>
      <td>
        <span
          className={
            subject.enrolledStudents > 0
              ? styles.enrolledActive
              : styles.enrolledZero
          }
        >
          {subject.enrolledStudents} al.
        </span>
      </td>
      <td>
        <StatusPill
          status={subject.status}
          activeClassName={styles.statusActive}
          inactiveClassName={styles.statusInactive}
        />
      </td>
      <td>
        <div className={styles.rowActions}>
          <button
            type="button"
            onClick={() => onEditSubject(subject)}
            className={styles.actionBtn}
            aria-label={`Editar materia ${subject.code} — ${subject.name}`}
          >
            ✎ Editar
          </button>
          <button
            type="button"
            onClick={() => onToggleSubjectStatus(subject)}
            className={styles.actionBtn}
            aria-label={
              isActive
                ? `Inactivar materia ${subject.code} — ${subject.name}`
                : `Reactivar materia ${subject.code} — ${subject.name}`
            }
          >
            {isActive ? 'Inactivar' : 'Reactivar'}
          </button>
          <button
            type="button"
            onClick={() => onDeleteSubject(subject)}
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            aria-label={`Dar de baja materia ${subject.code} — ${subject.name}`}
          >
            Baja
          </button>
        </div>
      </td>
    </tr>
  )
}
