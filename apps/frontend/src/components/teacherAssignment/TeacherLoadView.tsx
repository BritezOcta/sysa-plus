import { useMemo, useState } from 'react'
import type { TeacherLoadResponse, TeacherOption } from '../../api/teacherAssignment.api'
import tableStyles from '../academic/CurriculumTableView.module.css'
import styles from './TeacherAssignment.module.css'

interface TeacherLoadViewProps {
  teachers: TeacherOption[]
  selectedTeacherId: string
  onSelectTeacher: (teacherId: string) => void
  load: TeacherLoadResponse | null
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** RF-03 3.4: listado de materias y comisiones a cargo de cada docente. */
export default function TeacherLoadView({ teachers, selectedTeacherId, onSelectTeacher, load }: TeacherLoadViewProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = normalize(search.trim())
    return teachers.filter((t) => !term || normalize(`${t.fullName} ${t.dni}`).includes(term))
  }, [teachers, search])

  const current = load && load.teacher.id === selectedTeacherId ? load : null

  return (
    <div className={styles.teacherLoadLayout}>
      <aside className={styles.teacherListPanel}>
        <input
          type="search"
          className={tableStyles.searchInput}
          placeholder="Buscar docente por apellido o DNI"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar docente"
        />
        <ul className={styles.teacherList}>
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={`${styles.pickerItem} ${t.id === selectedTeacherId ? styles.pickerItemSelected : ''}`}
                onClick={() => onSelectTeacher(t.id)}
              >
                <span className={styles.pickerName}>{t.fullName}</span>
                <span className={styles.pickerMeta}>
                  DNI {t.dni}
                  {!t.isActive && <strong className={styles.inactiveTag}> · Inactivo</strong>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={tableStyles.tableContainer}>
        {!selectedTeacherId && <p className={styles.emptyState}>Elegí un docente para ver sus materias y comisiones.</p>}
        {selectedTeacherId && !current && <p className={styles.emptyState}>Cargando…</p>}
        {current && (
          <>
            <div className={tableStyles.tableHeaderBar}>
              <div>
                <h3>{current.teacher.fullName}</h3>
                <span className={tableStyles.tableHeaderSub}>Materias y comisiones a cargo</span>
              </div>
              <span className={tableStyles.tableCountBadge}>{current.assignments.length} comisiones</span>
            </div>
            {current.assignments.length === 0 ? (
              <p className={styles.emptyState}>Este docente no tiene comisiones asignadas.</p>
            ) : (
              <div className={tableStyles.tableResponsive}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Carrera</th>
                      <th>Materia</th>
                      <th>Comisión</th>
                      <th>Rol</th>
                      <th>Horario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.assignments.map((a) => (
                      <tr key={a.assignmentId} className={a.status === 'CANCELADA' ? tableStyles.rowInactive : undefined}>
                        <td>{a.period}</td>
                        <td>{a.careerName}</td>
                        <td>
                          <span className={tableStyles.codeBadge}>{a.subjectCode}</span> {a.subjectName}
                        </td>
                        <td>{a.commission}</td>
                        <td>{a.role === 'TITULAR' ? 'Titular' : 'Ayudante'}</td>
                        <td>{a.scheduleText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
