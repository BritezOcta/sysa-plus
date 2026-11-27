import { useMemo, useRef, useState } from 'react'
import type {
  AssignmentRole,
  CommissionWithTeachers,
  SubjectWithCommissions,
  TeacherOption,
} from '../../api/teacherAssignment.api'
import ModalShell from '../ui/ModalShell'
import modalStyles from '../academic/Modals.module.css'
import styles from './TeacherAssignment.module.css'

interface AssignTeacherModalProps {
  subject: SubjectWithCommissions
  commission: CommissionWithTeachers
  teachers: TeacherOption[]
  isSaving: boolean
  errorMessage: string | null
  onClose: () => void
  onAssign: (teacherId: string, role: AssignmentRole) => void
}

const MAX_RESULTS = 60

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** RF-03: elegir un docente y su rol (titular/ayudante) para una comisión. */
export default function AssignTeacherModal({
  subject,
  commission,
  teachers,
  isSaving,
  errorMessage,
  onClose,
  onAssign,
}: AssignTeacherModalProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const hasTitular = commission.teachers.some((t) => t.role === 'TITULAR')
  const [search, setSearch] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [role, setRole] = useState<AssignmentRole>(hasTitular ? 'AYUDANTE' : 'TITULAR')

  const assignedIds = useMemo(() => new Set(commission.teachers.map((t) => t.teacherId)), [commission])

  const results = useMemo(() => {
    const term = normalize(search.trim())
    return teachers
      .filter((t) => !assignedIds.has(t.id))
      .filter((t) => !term || normalize(`${t.fullName} ${t.dni} ${t.email}`).includes(term))
      .slice(0, MAX_RESULTS)
  }, [teachers, assignedIds, search])

  const selected = teachers.find((t) => t.id === teacherId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !selected.isActive) return
    onAssign(selected.id, role)
  }

  return (
    <ModalShell
      titleId="assign-teacher-title"
      title={`Asignar docente · ${commission.code}`}
      subtitle={`${subject.code} — ${subject.name} · ${commission.scheduleText}`}
      closeAriaLabel="Cerrar asignación de docente"
      initialFocusRef={searchRef}
      canClose={!isSaving}
      onRequestClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className={modalStyles.formBody}>
          {errorMessage && (
            <div className={modalStyles.errorBanner} role="alert">
              {errorMessage}
            </div>
          )}

          <div className={modalStyles.field}>
            <label htmlFor="teacher-search">
              Buscar docente <span className={modalStyles.req}>*</span>
            </label>
            <input
              id="teacher-search"
              ref={searchRef}
              type="search"
              className={modalStyles.miniSearch}
              placeholder="Apellido, nombre, DNI o email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ul className={styles.teacherPicker} role="listbox" aria-label="Docentes disponibles">
            {results.length === 0 && <li className={styles.pickerEmpty}>No hay docentes que coincidan con la búsqueda.</li>}
            {results.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={t.id === teacherId}
                  disabled={!t.isActive}
                  className={`${styles.pickerItem} ${t.id === teacherId ? styles.pickerItemSelected : ''}`}
                  onClick={() => setTeacherId(t.id)}
                  title={t.isActive ? undefined : 'Docente inactivo: no se puede asignar'}
                >
                  <span className={styles.pickerName}>{t.fullName}</span>
                  <span className={styles.pickerMeta}>
                    DNI {t.dni} · {t.email}
                    {!t.isActive && <strong className={styles.inactiveTag}> · Inactivo</strong>}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <fieldset className={styles.roleFieldset}>
            <legend>Rol en la comisión</legend>
            <label className={styles.roleOption}>
              <input
                type="radio"
                name="assignment-role"
                value="TITULAR"
                checked={role === 'TITULAR'}
                disabled={hasTitular}
                onChange={() => setRole('TITULAR')}
              />
              Titular
              {hasTitular && <span className={modalStyles.hint}> (la comisión ya tiene titular)</span>}
            </label>
            <label className={styles.roleOption}>
              <input
                type="radio"
                name="assignment-role"
                value="AYUDANTE"
                checked={role === 'AYUDANTE'}
                onChange={() => setRole('AYUDANTE')}
              />
              Ayudante
            </label>
          </fieldset>

          <p className={modalStyles.hint}>
            El docente asignado podrá cargar asistencias y notas y ver el listado de alumnos solo de esta comisión.
          </p>

          <div className={modalStyles.modalFooter}>
            <button type="button" className={modalStyles.secondaryBtn} onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className={modalStyles.primaryBtn} disabled={!selected?.isActive || isSaving}>
              {isSaving ? 'Asignando…' : selected ? `Asignar a ${selected.fullName}` : 'Elegí un docente'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
