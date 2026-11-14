import { Link } from 'react-router'
import { APP_ROUTES, CURRENT_ACADEMIC_USER } from '../../constants'
import styles from '../../pages/AcademicManagementPage.module.css'

export default function UserProfilePill() {
  return (
    <div className={styles.userProfilePill}>
      <div className={styles.avatarCircle} aria-hidden="true">
        {CURRENT_ACADEMIC_USER.INITIALS}
      </div>
      <div className={styles.userDetails}>
        <strong>{CURRENT_ACADEMIC_USER.FULL_NAME}</strong>
        <span>{CURRENT_ACADEMIC_USER.ROLE_SHORT}</span>
      </div>
      <Link
        to={APP_ROUTES.LOGIN}
        className={styles.logoutLink}
        title="Cerrar sesión e ir al inicio de sesión"
      >
        Salir
      </Link>
    </div>
  )
}
