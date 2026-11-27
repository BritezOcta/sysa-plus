import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminStudentsApi,
  type AdminCommissionStudentsResponse,
  type AdminCommissionSummary,
} from '../api/adminStudents.api'
import adminStyles from '../components/admin/AdminPages.module.css'
import tableStyles from '../components/academic/CurriculumTableView.module.css'
import styles from './AcademicManagementPage.module.css'

/** Porcentaje mínimo de asistencia para no quedar libre (RF-05 / RF-07). */
const MIN_ATTENDANCE = 75

const CONDITION: Record<string, { label: string; className: string | undefined }> = {
  INSCRIPTO: { label: 'Cursando', className: adminStyles.pillInfo },
  EN_RIESGO: { label: 'En riesgo', className: adminStyles.pillWarn },
  REGULAR: { label: 'Regular', className: adminStyles.pillOk },
  APROBADA: { label: 'Aprobada', className: adminStyles.pillOk },
  LIBRE: { label: 'Libre', className: adminStyles.pillDanger },
  DESAPROBADA: { label: 'Desaprobada', className: adminStyles.pillDanger },
  CANCELADA: { label: 'Cancelada', className: adminStyles.pillMuted },
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR')
}

/** RF-08: el Administrador/Director consulta los alumnos de cada comisión y las observaciones docentes. */
export default function AdminStudentsPage() {
  const [commissions, setCommissions] = useState<AdminCommissionSummary[]>([])
  const [period, setPeriod] = useState('all')
  const [commissionSearch, setCommissionSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<AdminCommissionStudentsResponse | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const loadCommissions = useCallback(() => {
    adminStudentsApi
      .getCommissions()
      .then((list) => {
        setError(null)
        setCommissions(list)
        const periods = [...new Set(list.map((c) => c.period))].sort().reverse()
        setPeriod((prev) => (prev === 'all' && periods[0] ? periods[0] : prev))
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las comisiones.'))
      .finally(() => setLoadingList(false))
  }, [])

  useEffect(() => {
    loadCommissions()
  }, [loadCommissions])

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    adminStudentsApi
      .getCommissionStudents(selectedId)
      .then((data) => {
        if (cancelled) return
        setError(null)
        setDetail(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDetail(null)
        setError(err instanceof Error ? err.message : 'No se pudo cargar el listado de alumnos.')
      })
      .finally(() => !cancelled && setLoadingDetail(false))
    return () => {
      cancelled = true
    }
  }, [selectedId, reloadKey])

  const periods = useMemo(() => [...new Set(commissions.map((c) => c.period))].sort().reverse(), [commissions])

  const visibleCommissions = useMemo(() => {
    const term = normalize(commissionSearch.trim())
    return commissions
      .filter((c) => period === 'all' || c.period === period)
      .filter((c) => !term || normalize(`${c.subjectCode} ${c.subjectName} ${c.commissionCode}`).includes(term))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'es') || a.commissionCode.localeCompare(b.commissionCode))
  }, [commissions, period, commissionSearch])

  const students = useMemo(() => {
    const term = normalize(studentSearch.trim())
    return (detail?.students ?? []).filter((s) => !term || normalize(`${s.fullName} ${s.legajo}`).includes(term))
  }, [detail, studentSearch])

  const stats = useMemo(() => {
    const list = detail?.students ?? []
    const active = list.filter((s) => s.enrollmentStatus !== 'CANCELADA')
    return {
      total: active.length,
      lowAttendance: active.filter((s) => s.attendancePercentage < MIN_ATTENDANCE).length,
      withObservations: list.filter((s) => s.observations.length > 0).length,
    }
  }, [detail])

  function toggleObservations(enrollmentId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(enrollmentId)) next.delete(enrollmentId)
      else next.add(enrollmentId)
      return next
    })
  }

  const commission = detail?.commission

  return (
    <div className={styles.pageLayout}>

      <main className={styles.mainContent}>
        <section className={styles.careersSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h1>Alumnos por comisión</h1>
              <p className={styles.sectionSubtitle}>
                Consultá los alumnos inscriptos en cada comisión, su condición, su asistencia y las observaciones de los docentes.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className={adminStyles.errorBox} role="alert">
            {error}{' '}
            <button
              type="button"
              className={adminStyles.linkBtn}
              onClick={() => {
                setError(null)
                if (selectedId) {
                  setLoadingDetail(true)
                  setReloadKey((k) => k + 1)
                } else {
                  setLoadingList(true)
                  loadCommissions()
                }
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        <div className={adminStyles.splitLayout}>
          <aside className={adminStyles.sidePanel}>
            <h2 className={adminStyles.sideTitle}>Comisiones</h2>
            <label className={tableStyles.filterField}>
              <span className={tableStyles.filterLabel}>Período</span>
              <select className={tableStyles.filterSelect} value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="all">Todos</option>
                {periods.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <input
              type="search"
              className={tableStyles.searchInput}
              placeholder="Materia o comisión"
              aria-label="Buscar comisión"
              value={commissionSearch}
              onChange={(e) => setCommissionSearch(e.target.value)}
            />
            {loadingList ? (
              <p className={adminStyles.muted}>Cargando comisiones…</p>
            ) : visibleCommissions.length === 0 ? (
              <p className={adminStyles.muted}>No hay comisiones que coincidan.</p>
            ) : (
              <ul className={adminStyles.sideList}>
                {visibleCommissions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`${adminStyles.sideItem} ${c.id === selectedId ? adminStyles.sideItemSelected : ''}`}
                      onClick={() => {
                        if (c.id === selectedId) return
                        setLoadingDetail(true)
                        setError(null)
                        setSelectedId(c.id)
                        setStudentSearch('')
                        setExpanded(new Set())
                      }}
                    >
                      <span className={adminStyles.sideItemTitle}>{c.subjectName}</span>
                      <span className={adminStyles.sideItemMeta}>
                        <span className={adminStyles.commissionTag}>{c.commissionCode}</span>
                        <span>{c.period}</span>
                        <span>· {c.enrolledCount} alumno{c.enrolledCount === 1 ? '' : 's'}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className={tableStyles.tableContainer}>
            {!selectedId && <p className={adminStyles.emptyInline}>Elegí una comisión para ver sus alumnos.</p>}
            {selectedId && loadingDetail && <p className={adminStyles.emptyInline}>Cargando alumnos…</p>}
            {selectedId && !loadingDetail && commission && (
              <>
                <div className={tableStyles.tableHeaderBar}>
                  <div>
                    <h3>
                      <span className={tableStyles.codeBadge}>{commission.subjectCode}</span> {commission.subjectName} · {commission.commissionCode}
                    </h3>
                    <span className={tableStyles.tableHeaderSub}>{commission.period}</span>
                  </div>
                  <input
                    type="search"
                    className={tableStyles.searchInput}
                    placeholder="Buscar por nombre o legajo"
                    aria-label="Buscar alumno"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>

                <div className={adminStyles.statsRow}>
                  <span className={adminStyles.statChip}>{stats.total} inscripto{stats.total === 1 ? '' : 's'}</span>
                  <span className={`${adminStyles.statChip} ${stats.lowAttendance ? adminStyles.statWarn : ''}`}>
                    {stats.lowAttendance} con asistencia menor al {MIN_ATTENDANCE}%
                  </span>
                  <span className={adminStyles.statChip}>{stats.withObservations} con observaciones</span>
                </div>

                {students.length === 0 ? (
                  <p className={adminStyles.emptyInline}>
                    {detail?.students.length ? 'Ningún alumno coincide con la búsqueda.' : 'No hay alumnos inscriptos en esta comisión.'}
                  </p>
                ) : (
                  <div className={tableStyles.tableResponsive}>
                    <table className={tableStyles.table}>
                      <thead>
                        <tr>
                          <th>Legajo</th>
                          <th>Alumno</th>
                          <th>Condición</th>
                          <th>Asistencia</th>
                          <th>Observaciones docentes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => {
                          const condition = CONDITION[s.enrollmentStatus] ?? { label: s.enrollmentStatus, className: adminStyles.pillMuted }
                          const open = expanded.has(s.enrollmentId)
                          return (
                            <tr key={s.enrollmentId} className={s.enrollmentStatus === 'CANCELADA' ? tableStyles.rowInactive : undefined}>
                              <td><span className={tableStyles.codeBadge}>{s.legajo}</span></td>
                              <td>
                                <div className={adminStyles.studentName}>{s.fullName}</div>
                                <div className={adminStyles.muted}>{s.email}</div>
                              </td>
                              <td><span className={`${adminStyles.pill} ${condition.className ?? ''}`}>{condition.label}</span></td>
                              <td>
                                <span className={`${adminStyles.attendance} ${s.attendancePercentage < MIN_ATTENDANCE ? adminStyles.attendanceLow : ''}`}>
                                  {s.attendancePercentage}%
                                </span>
                              </td>
                              <td>
                                {s.observations.length === 0 ? (
                                  <span className={adminStyles.muted}>Sin observaciones</span>
                                ) : (
                                  <>
                                    <button type="button" className={adminStyles.linkBtn} onClick={() => toggleObservations(s.enrollmentId)}>
                                      {open ? 'Ocultar' : `Ver ${s.observations.length} observaci${s.observations.length === 1 ? 'ón' : 'ones'}`}
                                    </button>
                                    {open && (
                                      <ul className={adminStyles.observationList}>
                                        {s.observations.map((obs) => (
                                          <li key={obs.id} className={adminStyles.observationItem}>
                                            {obs.text}
                                            <div className={adminStyles.muted}>{obs.teacherName} · {formatDate(obs.createdAt)}</div>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
