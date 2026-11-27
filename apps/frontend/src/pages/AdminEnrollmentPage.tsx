import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminCalendarApi,
  type CalendarOptions,
  type CommissionRow,
  type ExamCallRow,
  type ExamSessionRow,
  type PeriodRow,
  type PlanSubject,
  type WindowStatus,
} from '../api/adminCalendar.api'
import { NetworkError } from '../api/httpClient'
import adminStyles from '../components/admin/AdminPages.module.css'
import tableStyles from '../components/academic/CurriculumTableView.module.css'
import { ConfirmActionModal } from '../components/academic/modals'
import { CommissionModal, ExamCallModal, PeriodModal, SessionModal } from '../components/adminCalendar/CalendarModals'
import TopNavbar from '../components/layout/TopNavbar'
import ToastViewport from '../components/ui/ToastViewport'
import { useToastNotifications } from '../hooks/useToastNotifications'
import type { ConfirmDialogConfig } from '../types'
import styles from './AcademicManagementPage.module.css'

type Tab = 'cursadas' | 'examenes'
type Modal =
  | { kind: 'period'; item: PeriodRow | null }
  | { kind: 'session'; item: ExamSessionRow | null }
  | { kind: 'commission'; item: CommissionRow | null; subjectId?: string }
  | { kind: 'call'; item: ExamCallRow | null }
  | null

const WINDOW: Record<WindowStatus, { label: string; className: string | undefined }> = {
  ABIERTA: { label: 'Inscripción abierta', className: adminStyles.pillOk },
  PROXIMA: { label: 'Inscripción próxima', className: adminStyles.pillInfo },
  CERRADA: { label: 'Inscripción cerrada', className: adminStyles.pillMuted },
  SIN_DEFINIR: { label: 'Sin ventana de inscripción', className: adminStyles.pillWarn },
}

const fmt = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—')
const errorMessage = (err: unknown) => (err instanceof NetworkError ? 'No se pudo conectar con el servidor.' : err instanceof Error ? err.message : 'Error inesperado')

/** Administrador/Director: ventanas de inscripción, comisiones con horarios, turnos y mesas de examen. */
export default function AdminEnrollmentPage() {
  const [tab, setTab] = useState<Tab>('cursadas')
  const [options, setOptions] = useState<CalendarOptions>({ careers: [], teachers: [] })
  const [careerId, setCareerId] = useState('')
  const [subjects, setSubjects] = useState<PlanSubject[]>([])
  const [periods, setPeriods] = useState<PeriodRow[]>([])
  const [periodId, setPeriodId] = useState('')
  const [commissions, setCommissions] = useState<CommissionRow[]>([])
  const [onlyFull, setOnlyFull] = useState(false)
  const [sessions, setSessions] = useState<ExamSessionRow[]>([])
  const [sessionId, setSessionId] = useState('')
  const [calls, setCalls] = useState<ExamCallRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmDialogConfig | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const { toasts, pushToast, dismissToast } = useToastNotifications()

  const loadBase = useCallback(async () => {
    const [opts, p, s] = await Promise.all([adminCalendarApi.options(), adminCalendarApi.periods(), adminCalendarApi.sessions()])
    setOptions(opts)
    setPeriods(p.periods)
    setSessions(s.sessions)
    setCareerId((prev) => prev || opts.careers.find((c) => c.isActive)?.id || opts.careers[0]?.id || '')
    const preferred = p.periods.find((x) => x.windowStatus === 'ABIERTA') ?? p.periods.find((x) => x.windowStatus === 'PROXIMA') ?? p.periods[0]
    setPeriodId((prev) => (prev && p.periods.some((x) => x.id === prev) ? prev : preferred?.id ?? ''))
    const preferredSession = s.sessions.find((x) => x.windowStatus === 'ABIERTA') ?? s.sessions.find((x) => x.windowStatus === 'PROXIMA') ?? s.sessions[0]
    setSessionId((prev) => (prev && s.sessions.some((x) => x.id === prev) ? prev : preferredSession?.id ?? ''))
  }, [])

  useEffect(() => {
    // loadBase solo actualiza estado después de esperar las respuestas de la API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBase().then(() => setLoadError(null), (err: unknown) => setLoadError(errorMessage(err)))
  }, [loadBase, reloadKey])

  useEffect(() => {
    if (!careerId) return
    adminCalendarApi.subjects(careerId).then((r) => setSubjects(r.subjects), (err: unknown) => setLoadError(errorMessage(err)))
  }, [careerId])

  useEffect(() => {
    if (!careerId || !periodId) return
    adminCalendarApi.commissions(periodId, careerId).then((r) => setCommissions(r.commissions), (err: unknown) => setLoadError(errorMessage(err)))
  }, [careerId, periodId, reloadKey])

  useEffect(() => {
    if (!careerId || !sessionId) return
    adminCalendarApi.calls(sessionId, careerId).then((r) => setCalls(r.calls), (err: unknown) => setLoadError(errorMessage(err)))
  }, [careerId, sessionId, reloadKey])

  const period = periods.find((p) => p.id === periodId) ?? null
  const session = sessions.find((s) => s.id === sessionId) ?? null
  const visibleCommissions = useMemo(() => (onlyFull ? commissions.filter((c) => c.isFull) : commissions), [commissions, onlyFull])
  const fullCount = commissions.filter((c) => c.isFull && c.status === 'ABIERTA').length

  function openModal(next: Modal) {
    setModalError(null)
    setModal(next)
  }

  /** Guarda y recarga; los errores de negocio quedan en el modal para corregirlos. */
  async function save(task: () => Promise<unknown>, success: string) {
    setSaving(true)
    setModalError(null)
    try {
      await task()
      setModal(null)
      pushToast('success', 'Cambios guardados', success)
      setReloadKey((k) => k + 1)
    } catch (err) {
      if (err instanceof NetworkError) {
        setModal(null)
        pushToast('danger', 'Sin conexión', 'No se pudo confirmar el guardado. Se recargan los datos para consultar el estado.')
        setReloadKey((k) => k + 1)
      } else {
        setModalError(errorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  function remove(title: string, description: string, task: () => Promise<unknown>, success: string) {
    setConfirm({
      title,
      description,
      confirmLabel: 'Eliminar',
      tone: 'danger',
      onConfirm: () => {
        setConfirm(null)
        task().then(
          () => {
            pushToast('info', 'Eliminado', success)
            setReloadKey((k) => k + 1)
          },
          (err: unknown) => pushToast('danger', 'No se pudo eliminar', errorMessage(err)),
        )
      },
    })
  }

  const careerSelect = (
    <label className={tableStyles.filterField}>
      <span className={tableStyles.filterLabel}>Carrera</span>
      <select className={tableStyles.filterSelect} value={careerId} onChange={(e) => setCareerId(e.target.value)}>
        {options.careers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
      </select>
    </label>
  )

  return (
    <div className={styles.pageLayout}>
      <TopNavbar />

      <main className={styles.mainContent}>
        <section className={styles.careersSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h1>Inscripciones</h1>
              <p className={styles.sectionSubtitle}>
                Definí las ventanas de inscripción a cursadas y exámenes, abrí nuevas comisiones cuando se llenan y cargá las mesas de cada turno.
              </p>
            </div>
            <div className={styles.viewTabs} role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'cursadas'} className={`${styles.viewTabBtn} ${tab === 'cursadas' ? styles.viewTabActive : ''}`} onClick={() => setTab('cursadas')}>Cursadas</button>
              <button type="button" role="tab" aria-selected={tab === 'examenes'} className={`${styles.viewTabBtn} ${tab === 'examenes' ? styles.viewTabActive : ''}`} onClick={() => setTab('examenes')}>Exámenes</button>
            </div>
          </div>
        </section>

        {loadError && (
          <div className={adminStyles.errorBox} role="alert">
            {loadError}{' '}
            <button type="button" className={adminStyles.linkBtn} onClick={() => setReloadKey((k) => k + 1)}>Reintentar</button>
          </div>
        )}

        {tab === 'cursadas' ? (
          <>
            <section className={tableStyles.tableContainer}>
              <div className={tableStyles.tableHeaderBar}>
                <div>
                  <h3>Cuatrimestre</h3>
                  <span className={tableStyles.tableHeaderSub}>Fechas de cursada y ventana de inscripción</span>
                </div>
                <button type="button" className={adminStyles.secondaryAction} onClick={() => openModal({ kind: 'period', item: null })}>+ Nuevo cuatrimestre</button>
              </div>
              <div className={adminStyles.periodCard}>
                <label className={tableStyles.filterField}>
                  <span className={tableStyles.filterLabel}>Cuatrimestre</span>
                  <select className={tableStyles.filterSelect} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
                    {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </label>
                {period && (
                  <>
                    <span className={`${adminStyles.pill} ${WINDOW[period.windowStatus].className ?? ''}`}>{WINDOW[period.windowStatus].label}</span>
                    <div className={adminStyles.periodFacts}>
                      <span>Inscripción: <strong>{fmt(period.enrollmentStartDate)} al {fmt(period.enrollmentEndDate)}</strong></span>
                      <span>Cursada: <strong>{fmt(period.startDate)} al {fmt(period.endDate)}</strong></span>
                    </div>
                    <button type="button" className={adminStyles.reopenBtn} onClick={() => openModal({ kind: 'period', item: period })}>Editar / extender fechas</button>
                  </>
                )}
              </div>
            </section>

            <section className={tableStyles.tableContainer}>
              <div className={tableStyles.tableHeaderBar}>
                <div>
                  <h3>Comisiones del cuatrimestre</h3>
                  <span className={tableStyles.tableHeaderSub}>Los alumnos se inscriben hasta completar el cupo; si se llenan, abrí otra comisión.</span>
                </div>
                <button type="button" className={adminStyles.secondaryAction} disabled={!period || subjects.length === 0} onClick={() => openModal({ kind: 'commission', item: null })}>+ Nueva comisión</button>
              </div>
              <div className={tableStyles.filtersBar}>
                {careerSelect}
                <label className={adminStyles.sideItemMeta} style={{ alignSelf: 'flex-end', paddingBottom: 8 }}>
                  <input type="checkbox" checked={onlyFull} onChange={(e) => setOnlyFull(e.target.checked)} /> Solo comisiones llenas
                </label>
              </div>
              <div className={adminStyles.statsRow}>
                <span className={adminStyles.statChip}>{commissions.length} comisiones</span>
                <span className={`${adminStyles.statChip} ${fullCount ? adminStyles.statWarn : ''}`}>{fullCount} abiertas y llenas</span>
              </div>
              {visibleCommissions.length === 0 ? (
                <p className={adminStyles.emptyInline}>No hay comisiones para esta carrera en el cuatrimestre.</p>
              ) : (
                <div className={tableStyles.tableResponsive}>
                  <table className={tableStyles.table}>
                    <thead>
                      <tr><th>Materia</th><th>Comisión</th><th>Horario</th><th>Ocupación</th><th>Estado</th><th aria-label="Acciones" /></tr>
                    </thead>
                    <tbody>
                      {visibleCommissions.map((c) => (
                        <tr key={c.id} className={c.status === 'CANCELADA' ? tableStyles.rowInactive : undefined}>
                          <td>
                            <div className={adminStyles.studentName}>{c.subjectName}</div>
                            <div className={adminStyles.muted}>{c.subjectCode}{c.year ? ` · ${c.year}° año` : ''}</div>
                          </td>
                          <td><span className={adminStyles.commissionTag}>{c.code}</span></td>
                          <td className={adminStyles.muted}>{c.scheduleText}</td>
                          <td>
                            <div className={adminStyles.occupancy}>
                              <div className={adminStyles.occupancyBar}>
                                <div className={`${adminStyles.occupancyFill} ${c.isFull ? adminStyles.occupancyFull : ''}`} style={{ width: `${Math.min(100, (c.enrolled / c.capacity) * 100)}%` }} />
                              </div>
                              <span className={adminStyles.attendance}>{c.enrolled}/{c.capacity}</span>
                            </div>
                          </td>
                          <td>
                            {c.isFull && c.status === 'ABIERTA' ? (
                              <span className={`${adminStyles.pill} ${adminStyles.pillWarn}`}>Llena</span>
                            ) : (
                              <span className={`${adminStyles.pill} ${c.status === 'ABIERTA' ? adminStyles.pillOk : c.status === 'CANCELADA' ? adminStyles.pillDanger : adminStyles.pillMuted}`}>
                                {c.status === 'ABIERTA' ? 'Abierta' : c.status === 'CANCELADA' ? 'Cancelada' : 'Cerrada'}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className={adminStyles.rowActions}>
                              {c.isFull && <button type="button" className={adminStyles.reopenBtn} onClick={() => openModal({ kind: 'commission', item: null, subjectId: c.subjectId })}>+ Otra comisión</button>}
                              <button type="button" className={adminStyles.secondaryAction} onClick={() => openModal({ kind: 'commission', item: c })}>Editar</button>
                              <button type="button" className={adminStyles.dangerAction} onClick={() => remove(`Eliminar la comisión ${c.code}`, `¿Eliminar la comisión ${c.code} de ${c.subjectName}? Solo se puede si no tiene inscripciones ni clases.`, () => adminCalendarApi.deleteCommission(c.id), `Se eliminó la comisión ${c.code}.`)}>Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className={tableStyles.tableContainer}>
              <div className={tableStyles.tableHeaderBar}>
                <div>
                  <h3>Turno de examen</h3>
                  <span className={tableStyles.tableHeaderSub}>Fechas del turno y ventana de inscripción a las mesas</span>
                </div>
                <button type="button" className={adminStyles.secondaryAction} onClick={() => openModal({ kind: 'session', item: null })}>+ Nuevo turno</button>
              </div>
              <div className={adminStyles.periodCard}>
                <label className={tableStyles.filterField}>
                  <span className={tableStyles.filterLabel}>Turno</span>
                  <select className={tableStyles.filterSelect} value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                    {sessions.length === 0 && <option value="">No hay turnos</option>}
                    {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                {session && (
                  <>
                    <span className={`${adminStyles.pill} ${WINDOW[session.windowStatus].className ?? ''}`}>{WINDOW[session.windowStatus].label}</span>
                    <div className={adminStyles.periodFacts}>
                      <span>Inscripción: <strong>{fmt(session.enrollmentStartDate)} al {fmt(session.enrollmentEndDate)}</strong></span>
                      <span>Turno: <strong>{fmt(session.startDate)} al {fmt(session.endDate)}</strong></span>
                    </div>
                    <button type="button" className={adminStyles.reopenBtn} onClick={() => openModal({ kind: 'session', item: session })}>Editar / extender fechas</button>
                  </>
                )}
              </div>
            </section>

            <section className={tableStyles.tableContainer}>
              <div className={tableStyles.tableHeaderBar}>
                <div>
                  <h3>Mesas del turno</h3>
                  <span className={tableStyles.tableHeaderSub}>El alumno elige la mesa que quiera dentro de la ventana de inscripción.</span>
                </div>
                <button type="button" className={adminStyles.secondaryAction} disabled={!session || subjects.length === 0} onClick={() => openModal({ kind: 'call', item: null })}>+ Nueva mesa</button>
              </div>
              <div className={tableStyles.filtersBar}>{careerSelect}</div>
              {calls.length === 0 ? (
                <p className={adminStyles.emptyInline}>{session ? 'No hay mesas de esta carrera en el turno.' : 'Creá un turno de examen para cargar mesas.'}</p>
              ) : (
                <div className={tableStyles.tableResponsive}>
                  <table className={tableStyles.table}>
                    <thead>
                      <tr><th>Fecha y hora</th><th>Materia</th><th>Aula</th><th>Docente</th><th>Inscriptos</th><th>Estado</th><th aria-label="Acciones" /></tr>
                    </thead>
                    <tbody>
                      {calls.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{fmt(c.date)}</strong> {c.time} hs</td>
                          <td>
                            <div className={adminStyles.studentName}>{c.subjectName}</div>
                            <div className={adminStyles.muted}>{c.subjectCode}</div>
                          </td>
                          <td>{c.classroom ?? <span className={adminStyles.muted}>A confirmar</span>}</td>
                          <td>{c.teacher?.fullName ?? <span className={adminStyles.muted}>A designar</span>}</td>
                          <td className={adminStyles.attendance}>{c.enrolled}{c.capacity ? `/${c.capacity}` : ''}</td>
                          <td><span className={`${adminStyles.pill} ${c.status === 'ABIERTA' ? adminStyles.pillOk : adminStyles.pillMuted}`}>{c.status === 'ABIERTA' ? 'Abierta' : 'Cerrada'}</span></td>
                          <td>
                            <div className={adminStyles.rowActions}>
                              <button type="button" className={adminStyles.secondaryAction} onClick={() => openModal({ kind: 'call', item: c })}>Editar</button>
                              <button type="button" className={adminStyles.dangerAction} onClick={() => remove('Eliminar mesa', `¿Eliminar la mesa de ${c.subjectName} del ${fmt(c.date)}? Solo se puede si no tiene inscriptos.`, () => adminCalendarApi.deleteCall(c.id), 'Se eliminó la mesa.')}>Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {modal?.kind === 'period' && (
        <PeriodModal period={modal.item} saving={saving} error={modalError} onClose={() => setModal(null)}
          onSave={(body) => void save(() => adminCalendarApi.savePeriod(modal.item?.id ?? null, body), 'Se guardaron las fechas del cuatrimestre.')} />
      )}
      {modal?.kind === 'session' && (
        <SessionModal session={modal.item} saving={saving} error={modalError} onClose={() => setModal(null)}
          onSave={(body) => void save(() => adminCalendarApi.saveSession(modal.item?.id ?? null, body), 'Se guardó el turno de examen.')} />
      )}
      {modal?.kind === 'commission' && period && (
        <CommissionModal commission={modal.item} subjects={subjects} existing={commissions} {...(modal.subjectId ? { defaultSubjectId: modal.subjectId } : {})}
          saving={saving} error={modalError} onClose={() => setModal(null)}
          onSave={(body) => void save(() => adminCalendarApi.saveCommission(modal.item?.id ?? null, { ...body, periodId: period.id }), `Se guardó la comisión ${body.code}.`)} />
      )}
      {modal?.kind === 'call' && session && (
        <ExamCallModal call={modal.item} subjects={subjects} teachers={options.teachers} saving={saving} error={modalError} onClose={() => setModal(null)}
          onSave={(body) => void save(() => adminCalendarApi.saveCall(modal.item?.id ?? null, { ...body, sessionId: session.id }), 'Se guardó la mesa de examen.')} />
      )}

      {confirm && (
        <ConfirmActionModal title={confirm.title} description={confirm.description} confirmLabel={confirm.confirmLabel} tone="danger"
          onClose={() => setConfirm(null)} onConfirm={confirm.onConfirm} />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
