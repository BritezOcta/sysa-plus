import { useEffect, useState } from 'react'
import { adminUsersApi, type AdminUserRow } from '../api/adminUsers.api'
import { NetworkError } from '../api/httpClient'
import adminStyles from '../components/admin/AdminPages.module.css'
import tableStyles from '../components/academic/CurriculumTableView.module.css'
import modalStyles from '../components/academic/Modals.module.css'
import { ConfirmActionModal } from '../components/academic/modals'
import StudentStatusModal from '../components/admin/StudentStatusModal'
import ModalShell from '../components/ui/ModalShell'
import ToastViewport from '../components/ui/ToastViewport'
import { useToastNotifications } from '../hooks/useToastNotifications'
import styles from './AcademicManagementPage.module.css'

const ROLE_LABELS: Record<AdminUserRow['role'], string> = {
  ALUMNO: 'Alumno',
  PROFESOR: 'Profesor',
  ADMINISTRADOR: 'Administrador',
}

/** Administrador/Director: búsqueda de usuarios y restablecimiento de contraseña con clave temporal. */
export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('')
  const [changingStatus, setChangingStatus] = useState<AdminUserRow | null>(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [limit, setLimit] = useState(50)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<AdminUserRow | null>(null)
  const [result, setResult] = useState<{ temporaryPassword: string; fullName: string; dni: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const { toasts, pushToast, dismissToast } = useToastNotifications()

  // Búsqueda con una pequeña demora para no consultar en cada tecla.
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      adminUsersApi
        .search(search.trim(), role, statusFilter)
        .then((data) => {
          if (cancelled) return
          setUsers(data.users)
          setLimit(data.limit)
          setError(null)
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof NetworkError ? 'No se pudo conectar con el servidor.' : err instanceof Error ? err.message : 'Error inesperado')
        })
        .finally(() => !cancelled && setLoading(false))
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [search, role, statusFilter, reloadKey])

  async function handleStatusChange(user: AdminUserRow, reason: string) {
    setSavingStatus(true)
    try {
      const res = await adminUsersApi.setStatus(user.id, user.isActive ? 'inactive' : 'active', reason)
      pushToast(
        'success',
        res.isActive ? 'Alumno reactivado' : 'Alumno dado de baja',
        res.isActive
          ? `${user.fullName} puede volver a iniciar sesión.`
          : `${user.fullName} quedó dado de baja. Se cancelaron ${res.cancelledCourses} cursada(s) y ${res.cancelledExams} final(es).`,
      )
      setChangingStatus(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      pushToast('danger', 'No se pudo cambiar el estado', err instanceof NetworkError ? 'No se pudo conectar con el servidor. Consultá el estado antes de reintentar.' : err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleReset(user: AdminUserRow) {
    setConfirming(null)
    try {
      setResult(await adminUsersApi.resetPassword(user.id))
      setCopied(false)
      setReloadKey((k) => k + 1)
    } catch (err) {
      pushToast('danger', 'No se pudo restablecer la contraseña', err instanceof NetworkError ? 'No se pudo conectar con el servidor. Consultá el estado antes de reintentar.' : err instanceof Error ? err.message : 'Error inesperado')
    }
  }

  async function copyPassword() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.temporaryPassword)
      setCopied(true)
    } catch {
      pushToast('warning', 'No se pudo copiar', 'Seleccioná la contraseña y copiala manualmente.')
    }
  }

  return (
    <div className={styles.pageLayout}>

      <main className={styles.mainContent}>
        <section className={styles.careersSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h1>Usuarios</h1>
              <p className={styles.sectionSubtitle}>
                Buscá alumnos, profesores o administradores y restablecé su contraseña. El usuario recibe una clave temporal y debe cambiarla al iniciar sesión. A los alumnos también podés darlos de baja o reactivarlos.
              </p>
            </div>
          </div>
        </section>

        <section className={tableStyles.tableContainer}>
          <div className={tableStyles.tableHeaderBar}>
            <div>
              <h3>Buscar usuario</h3>
              <span className={tableStyles.tableHeaderSub}>Por DNI, nombre, apellido, email o legajo</span>
            </div>
            <span className={tableStyles.tableCountBadge}>{users.length}{users.length === limit ? '+' : ''} resultados</span>
          </div>
          <div className={tableStyles.filtersBar}>
            <label className={tableStyles.filterField}>
              <span className={tableStyles.filterLabel}>Buscar</span>
              <input
                type="search"
                className={tableStyles.searchInput}
                placeholder="Ej.: 40123456 o Pérez"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className={tableStyles.filterField}>
              <span className={tableStyles.filterLabel}>Rol</span>
              <select className={tableStyles.filterSelect} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Todos</option>
                <option value="ALUMNO">Alumnos</option>
                <option value="PROFESOR">Profesores</option>
                <option value="ADMINISTRADOR">Administradores</option>
              </select>
            </label>
            <label className={tableStyles.filterField}>
              <span className={tableStyles.filterLabel}>Estado</span>
              <select className={tableStyles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}>
                <option value="">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Dados de baja</option>
              </select>
            </label>
          </div>

          {error && <div className={adminStyles.errorBox} role="alert">{error}</div>}
          {loading ? (
            <p className={adminStyles.emptyInline}>Cargando usuarios…</p>
          ) : users.length === 0 ? (
            <p className={adminStyles.emptyInline}>No hay usuarios que coincidan con la búsqueda.</p>
          ) : (
            <div className={tableStyles.tableResponsive}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>DNI</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={u.isActive ? undefined : tableStyles.rowInactive}>
                      <td><span className={tableStyles.codeBadge}>{u.dni}</span></td>
                      <td>
                        <div className={adminStyles.studentName}>{u.fullName}</div>
                        <div className={adminStyles.muted}>{u.email}{u.legajo ? ` · Legajo ${u.legajo}` : ''}</div>
                      </td>
                      <td>{ROLE_LABELS[u.role] ?? u.role}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          <span className={`${adminStyles.pill} ${u.isActive ? adminStyles.pillOk : adminStyles.pillMuted}`}>{u.isActive ? 'Activo' : 'Dado de baja'}</span>
                          {u.isLocked && <span className={`${adminStyles.pill} ${adminStyles.pillDanger}`}>Bloqueado</span>}
                          {u.mustChangePassword && <span className={`${adminStyles.pill} ${adminStyles.pillWarn}`}>Clave temporal</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {u.role === 'ALUMNO' && (
                          <button type="button" className={adminStyles.reopenBtn} style={{ marginRight: 6 }} onClick={() => setChangingStatus(u)}>
                            {u.isActive ? 'Dar de baja' : 'Reactivar'}
                          </button>
                        )}
                        <button type="button" className={adminStyles.reopenBtn} disabled={!u.isActive} onClick={() => setConfirming(u)}>
                          Restablecer contraseña
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {confirming && (
        <ConfirmActionModal
          title={`Restablecer la contraseña de ${confirming.fullName}`}
          description={`Se generará una contraseña temporal para ${confirming.fullName} (DNI ${confirming.dni}). Su contraseña actual dejará de funcionar.`}
          impactDetail="La cuenta se desbloquea si estaba bloqueada, y el usuario deberá elegir una contraseña nueva al iniciar sesión."
          confirmLabel="Restablecer contraseña"
          tone="warning"
          onClose={() => setConfirming(null)}
          onConfirm={() => void handleReset(confirming)}
        />
      )}

      {changingStatus && (
        <StudentStatusModal
          user={changingStatus}
          submitting={savingStatus}
          onClose={() => setChangingStatus(null)}
          onConfirm={(reason) => void handleStatusChange(changingStatus, reason)}
        />
      )}

      {result && (
        <ModalShell
          titleId="temp-password-title"
          title="Contraseña temporal generada"
          subtitle={`${result.fullName} · DNI ${result.dni}`}
          closeAriaLabel="Cerrar"
          onRequestClose={() => setResult(null)}
        >
          <div className={modalStyles.formBody}>
            <p className={modalStyles.hint}>Entregásela al usuario. <strong>No se vuelve a mostrar</strong>: si se pierde, hay que restablecerla otra vez.</p>
            <div className={adminStyles.tempPassword} aria-label="Contraseña temporal">{result.temporaryPassword}</div>
            <p className={modalStyles.hint}>Al iniciar sesión con ella, el sistema le pedirá elegir una contraseña nueva.</p>
            <div className={modalStyles.modalFooter}>
              <button type="button" className={modalStyles.secondaryBtn} onClick={() => void copyPassword()}>
                {copied ? '¡Copiada!' : 'Copiar'}
              </button>
              <button type="button" className={modalStyles.primaryBtn} onClick={() => setResult(null)}>
                Listo
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
