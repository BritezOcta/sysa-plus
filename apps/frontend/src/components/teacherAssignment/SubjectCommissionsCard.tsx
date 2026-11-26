import type {
  AssignedTeacher,
  CommissionWithTeachers,
  OfferingStatus,
  SubjectWithCommissions,
} from '../../api/teacherAssignment.api'
import styles from './TeacherAssignment.module.css'

interface SubjectCommissionsCardProps {
  subject: SubjectWithCommissions
  isSaving: boolean
  onAssign: (subject: SubjectWithCommissions, commission: CommissionWithTeachers) => void
  onChangeRole: (subject: SubjectWithCommissions, commission: CommissionWithTeachers, teacher: AssignedTeacher) => void
  onUnassign: (subject: SubjectWithCommissions, commission: CommissionWithTeachers, teacher: AssignedTeacher) => void
}

const STATUS_LABELS: Record<OfferingStatus, string> = {
  ABIERTA: 'Abierta',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
  LLENA: 'Llena',
}

const STATUS_CLASSES: Record<OfferingStatus, string> = {
  ABIERTA: styles.statusOpen ?? '',
  CERRADA: styles.statusClosed ?? '',
  CANCELADA: styles.statusCancelled ?? '',
  LLENA: styles.statusFull ?? '',
}

function shortDay(dayName: string): string {
  return dayName.slice(0, 3)
}

export default function SubjectCommissionsCard({
  subject,
  isSaving,
  onAssign,
  onChangeRole,
  onUnassign,
}: SubjectCommissionsCardProps) {
  return (
    <article className={`${styles.subjectCard} ${subject.isActive ? '' : styles.subjectInactive}`}>
      <header className={styles.subjectHeader}>
        <span className={styles.subjectCode}>{subject.code}</span>
        <h4 className={styles.subjectName}>{subject.name}</h4>
        {!subject.isActive && <span className={styles.inactiveTag}>Inactiva</span>}
      </header>

      {subject.commissions.length === 0 ? (
        <p className={styles.noCommission}>
          Sin comisiones en este período. Creá la cursada antes de asignar un docente.
        </p>
      ) : (
        <ul className={styles.commissionList}>
          {subject.commissions.map((commission) => {
            const cancelled = commission.status === 'CANCELADA'
            const hasTitular = commission.teachers.some((t) => t.role === 'TITULAR')
            return (
              <li key={commission.id} className={`${styles.commissionRow} ${cancelled ? styles.commissionCancelled : ''}`}>
                <div className={styles.commissionMeta}>
                  <span className={styles.commissionCode}>{commission.code}</span>
                  <span className={`${styles.statusPill} ${STATUS_CLASSES[commission.status]}`}>
                    {STATUS_LABELS[commission.status] ?? commission.status}
                  </span>
                  <span className={styles.enrolled} title="Inscriptos / cupo">
                    {commission.enrolledCount}/{commission.capacity} inscriptos
                  </span>
                </div>

                <div className={styles.scheduleChips} aria-label={`Horario: ${commission.scheduleText}`}>
                  {commission.schedule.length === 0 ? (
                    <span className={styles.scheduleChipMuted}>Horario a confirmar</span>
                  ) : (
                    commission.schedule.map((slot) => (
                      <span key={`${slot.dayOfWeek}-${slot.startTime}`} className={styles.scheduleChip}>
                        {shortDay(slot.dayName)} {slot.startTime}–{slot.endTime}
                      </span>
                    ))
                  )}
                </div>

                <div className={styles.teacherChips}>
                  {commission.teachers.length === 0 && !cancelled && (
                    <span className={styles.missingTeacher}>Sin docente asignado</span>
                  )}
                  {commission.teachers.length > 0 && !hasTitular && !cancelled && (
                    <span className={styles.missingTeacher}>Falta titular</span>
                  )}
                  {commission.teachers.map((teacher) => (
                    <span
                      key={teacher.assignmentId}
                      className={`${styles.teacherChip} ${teacher.role === 'TITULAR' ? styles.teacherTitular : ''} ${teacher.isActive ? '' : styles.teacherInactive}`}
                    >
                      <button
                        type="button"
                        className={styles.roleBadge}
                        disabled={isSaving}
                        onClick={() => onChangeRole(subject, commission, teacher)}
                        title={`Cambiar a ${teacher.role === 'TITULAR' ? 'ayudante' : 'titular'}`}
                        aria-label={`${teacher.fullName}: ${teacher.role === 'TITULAR' ? 'titular' : 'ayudante'}. Cambiar rol`}
                      >
                        {teacher.role === 'TITULAR' ? 'T' : 'A'}
                      </button>
                      <span>{teacher.fullName}</span>
                      {!teacher.isActive && <span className={styles.inactiveTag}>inactivo</span>}
                      <button
                        type="button"
                        className={styles.removeTeacherBtn}
                        disabled={isSaving}
                        onClick={() => onUnassign(subject, commission, teacher)}
                        aria-label={`Desasignar a ${teacher.fullName}`}
                        title="Desasignar"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.assignBtn}
                  disabled={cancelled || isSaving}
                  onClick={() => onAssign(subject, commission)}
                  title={cancelled ? 'La comisión está cancelada' : undefined}
                >
                  + Asignar docente
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
