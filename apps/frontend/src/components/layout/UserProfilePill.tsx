import { useNavigate } from 'react-router'
import { useAuth, useAuthenticatedUser } from '../../auth/AuthContext'
import { APP_ROUTES, ROLE_LABELS } from '../../constants'
import { getUserFullName, getUserInitials } from '../../helpers/UserDisplayHelper'
import styles from '../../pages/AcademicManagementPage.module.css'

export default function UserProfilePill() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useAuthenticatedUser()

  async function handleLogout() {
    await logout()
    navigate(APP_ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className={styles.userProfilePill}>
      <div className={styles.avatarCircle} aria-hidden="true">
        {getUserInitials(user)}
      </div>
      <div className={styles.userDetails}>
        <strong>{getUserFullName(user)}</strong>
        <span>{ROLE_LABELS[user.role]}</span>
      </div>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className={styles.logoutLink}
        title="Cerrar sesión e ir al inicio de sesión"
      >
        Salir
      </button>
    </div>
  )
}
