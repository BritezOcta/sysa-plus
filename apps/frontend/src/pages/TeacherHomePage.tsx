import { useNavigate } from 'react-router'
import utnLogo from '../assets/images/utn-logotipo.svg'
import { useAuth, useAuthenticatedUser } from '../auth/AuthContext'
import { APP_ROUTES, INSTITUTION_BRAND, ROLE_LABELS } from '../constants'
import { getUserFullName } from '../helpers/UserDisplayHelper'
import styles from './TeacherHomePage.module.css'

/**
 * Vista principal mínima del rol Profesor (RF-01).
 * Las funcionalidades docentes llegan con RF-03, RF-05, RF-07 y RF-08.
 */
export default function TeacherHomePage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useAuthenticatedUser()

  async function handleLogout() {
    await logout()
    navigate(APP_ROUTES.LOGIN, { replace: true })
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <img src={utnLogo} alt={INSTITUTION_BRAND.LOGO_ALT} className={styles.logo} />
        <h1>Hola, {getUserFullName(user)}</h1>
        <p className={styles.role}>{ROLE_LABELS[user.role]}</p>
        <p className={styles.muted}>
          El módulo docente (carga de notas, asistencias y listado de alumnos) estará disponible próximamente.
        </p>
        <button type="button" className={styles.logoutButton} onClick={() => void handleLogout()}>
          Cerrar sesión
        </button>
      </section>
    </main>
  )
}
