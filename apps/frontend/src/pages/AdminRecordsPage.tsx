import { useCallback, useEffect, useRef, useState } from 'react'
import { adminRecordsApi, type ClosedRecords, type RecordKind } from '../api/adminRecords.api'
import { NetworkError } from '../api/httpClient'
import adminStyles from '../components/admin/AdminPages.module.css'
import tableStyles from '../components/academic/CurriculumTableView.module.css'
import modalStyles from '../components/academic/Modals.module.css'
import { NetworkErrorModal } from '../components/academic/modals'
import ModalShell from '../components/ui/ModalShell'
import ToastViewport from '../components/ui/ToastViewport'
import { useFailedOperation } from '../hooks/useFailedOperation'
import { useToastNotifications } from '../hooks/useToastNotifications'
import styles from './AcademicManagementPage.module.css'

interface Row {
  kind: RecordKind
  id: string
  title: string
  subtitle: string
  period: string
  closed: string
}

const EMPTY: ClosedRecords = { courses: [], assessments: [], examCalls: [] }

/** "2025-12-12" o ISO completo → "12/12/2025" (las fechas sin hora no se corren por zona horaria). */
function formatDate(value: string): string {
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (plain) return `${plain[3]}/${plain[2]}/${plain[1]}`
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-AR')
}
const MAX_REASON = 500

/** RF-07: el Administrador/Director reabre actas cerradas indicando el motivo (queda en la auditoría). */
export default function AdminRecordsPage() {
  const [records, setRecords] = useState<ClosedRecords>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reopening, setReopening] = useState<Row | null>(null)
  const [reason, setReason] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  const { toasts, pushToast, dismissToast } = useToastNotifications()
  const { pendingFailedOperation, reportFailedOperation, dismissFailedOperation } = useFailedOperation()

  const load = useCallback(() => {
    return adminRecordsApi
      .listClosed()
      .then((data) => {
        setLoadError(null)
        setRecords(data)
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar las actas.'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openReopen(row: Row) {
    setReopening(row)
    setReason('')
    setModalError(null)
  }

  async function handleReopen(e: React.FormEvent) {
    e.preventDefault()
    if (!reopening) return
    const text = reason.trim()
    if (!text) {
      setModalError('Indicá el motivo de la reapertura.')
      return
    }
    setIsSaving(true)
    setModalError(null)
    try {
      await adminRecordsApi.reopen(reopening.kind, reopening.id, text)
      pushToast('success', 'Acta reabierta', `${reopening.title} quedó habilitada para el profesor.`)
      setReopening(null)
      await load()
    } catch (err) {
      if (err instanceof NetworkError) {
        // El servidor pudo haber reabierto el acta: se consulta el estado en vez de repetir.
        setReopening(null)
        reportFailedOperation(`Reabrir ${reopening.title}`, () => void load())
      } else {
        setModalError(err instanceof Error ? err.message : 'No se pudo reabrir el acta.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const sections: { title: string; hint: string; columns: [string, string, string]; rows: Row[] }[] = [
    {
      title: 'Cursadas cerradas',
      hint: 'Reabrir una cursada permite al profesor volver a cargar asistencia y evaluaciones. Las condiciones se recalculan cuando la vuelva a cerrar. Si también hay que corregir notas, después reabrí el acta de la evaluación.',
      columns: ['Materia y comisión', 'Período', 'Cerrada el'],
      rows: records.courses.map((c) => ({
        kind: 'courses',
        id: c.id,
        title: c.subjectName,
        subtitle: `Comisión ${c.commission}`,
        period: c.period,
        closed: formatDate(c.closedAt),
      })),
    },
    {
      title: 'Actas de evaluaciones cerradas',
      hint: 'Solo se listan las de cursadas abiertas. Reabrir el acta permite al profesor corregir las notas de esa evaluación.',
      columns: ['Evaluación', 'Período', 'Tipo'],
      rows: records.assessments.map((a) => ({
        kind: 'assessments',
        id: a.id,
        title: `${a.name} — ${a.subjectName}`,
        subtitle: `Comisión ${a.commission}`,
        period: a.period,
        closed: a.type,
      })),
    },
    {
      title: 'Actas de finales cerradas',
      hint: 'Reabrir la mesa permite al profesor corregir las notas del final.',
      columns: ['Materia', 'Turno de examen', 'Fecha de la mesa'],
      rows: records.examCalls.map((c) => ({
        kind: 'exam-calls',
        id: c.id,
        title: c.subjectName,
        subtitle: 'Examen final',
        period: c.sessionName,
        closed: formatDate(c.callDate),
      })),
    },
  ]

  const total = sections.reduce((n, s) => n + s.rows.length, 0)

  return (
    <div className={styles.pageLayout}>

      <main className={styles.mainContent}>
        <section className={styles.careersSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h1>Reapertura de actas</h1>
              <p className={styles.sectionSubtitle}>
                Reabrí cursadas y actas cerradas para que el profesor pueda corregirlas. El motivo queda registrado en la auditoría.
              </p>
            </div>
            {!isLoading && !loadError && (
              <span className={tableStyles.tableCountBadge}>{total} acta{total === 1 ? '' : 's'} cerrada{total === 1 ? '' : 's'}</span>
            )}
          </div>
        </section>

        {loadError && (
          <div className={adminStyles.errorBox} role="alert">
            {loadError}{' '}
            <button type="button" className={adminStyles.linkBtn} onClick={() => { setLoadError(null); setIsLoading(true); void load() }}>
              Reintentar
            </button>
          </div>
        )}

        {isLoading ? (
          <p className={adminStyles.emptyState}>Cargando actas…</p>
        ) : (
          !loadError &&
          sections.map((section) => (
            <section key={section.title} className={`${tableStyles.tableContainer} ${adminStyles.recordSection}`}>
              <div className={tableStyles.tableHeaderBar}>
                <div>
                  <h3>{section.title}</h3>
                </div>
                <span className={tableStyles.tableCountBadge}>{section.rows.length}</span>
              </div>
              <p className={adminStyles.sectionHint}>{section.hint}</p>
              {section.rows.length === 0 ? (
                <p className={adminStyles.emptyInline}>No hay actas cerradas.</p>
              ) : (
                <div className={tableStyles.tableResponsive}>
                  <table className={tableStyles.table}>
                    <thead>
                      <tr>
                        <th>{section.columns[0]}</th>
                        <th>{section.columns[1]}</th>
                        <th>{section.columns[2]}</th>
                        <th aria-label="Acciones" />
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr key={`${row.kind}-${row.id}`}>
                          <td>
                            <div className={adminStyles.studentName}>{row.title}</div>
                            <div className={adminStyles.muted}>{row.subtitle}</div>
                          </td>
                          <td>{row.period}</td>
                          <td>{row.closed}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" className={adminStyles.reopenBtn} onClick={() => openReopen(row)}>
                              Reabrir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))
        )}
      </main>

      {reopening && (
        <ModalShell
          titleId="reopen-record-title"
          title={`Reabrir · ${reopening.title}`}
          subtitle={`${reopening.subtitle} · ${reopening.period}`}
          closeAriaLabel="Cerrar reapertura de acta"
          tone="warning"
          initialFocusRef={reasonRef}
          canClose={!isSaving}
          onRequestClose={() => setReopening(null)}
        >
          <form onSubmit={(e) => void handleReopen(e)}>
            <div className={modalStyles.formBody}>
              {modalError && (
                <div className={modalStyles.errorBanner} role="alert">{modalError}</div>
              )}
              <div className={modalStyles.field}>
                <label htmlFor="reopen-reason">
                  Motivo de la reapertura <span className={modalStyles.req}>*</span>
                </label>
                <textarea
                  id="reopen-reason"
                  ref={reasonRef}
                  className={adminStyles.reasonInput}
                  value={reason}
                  maxLength={MAX_REASON}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej.: error de carga en la nota del parcial de un alumno"
                />
                <span className={adminStyles.charCount}>{reason.length}/{MAX_REASON}</span>
              </div>
              <p className={modalStyles.hint}>El motivo queda registrado en la auditoría junto con tu usuario y la fecha.</p>
              <div className={modalStyles.modalFooter}>
                <button type="button" className={modalStyles.secondaryBtn} onClick={() => setReopening(null)} disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className={modalStyles.amberBtn} disabled={isSaving || !reason.trim()}>
                  {isSaving ? 'Reabriendo…' : 'Confirmar reapertura'}
                </button>
              </div>
            </div>
          </form>
        </ModalShell>
      )}

      {pendingFailedOperation && (
        <NetworkErrorModal
          actionDescription={pendingFailedOperation.description}
          onClose={dismissFailedOperation}
          onRetry={pendingFailedOperation.retryFn}
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
