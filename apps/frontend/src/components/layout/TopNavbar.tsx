import { Link } from 'react-router'
import utnLogo from '../../assets/images/utn-logotipo.svg'
import { APP_ROUTES, INSTITUTION_BRAND } from '../../constants'
import styles from '../../pages/AcademicManagementPage.module.css'
import SimulationToolbarGroup from './SimulationToolbarGroup'
import UserProfilePill from './UserProfilePill'

/** Herramientas de simulación del prototipo (solo Oferta académica las usa). */
interface SimulationToolsProps {
  simulateServerFault: boolean
  onToggleServerFault: (enabled: boolean) => void
  onResetMockData: () => void
  resetButtonLabel?: string
}

interface AuditButtonProps {
  auditCount: number
  unreadAuditCount: number
  onOpenAuditDrawer: () => void
}

interface TopNavbarProps {
  simulation?: SimulationToolsProps
  audit?: AuditButtonProps
}

export default function TopNavbar({ simulation, audit }: TopNavbarProps) {
  return (
    <header className={styles.topNavbar}>
      <div className={styles.brandBlock}>
        <img
          src={utnLogo}
          alt={INSTITUTION_BRAND.LOGO_ALT}
          className={styles.utnLogo}
        />
        <div className={styles.brandText}>
          <div className={styles.sysTitleRow}>
            <strong>{INSTITUTION_BRAND.SYSTEM_NAME}</strong>
            <span className={styles.frgpBadge}>
              {INSTITUTION_BRAND.CAMPUS_BADGE}
            </span>
          </div>
          <span>{INSTITUTION_BRAND.MODULE_SUBTITLE}</span>
        </div>
      </div>

      <div className={styles.navControls}>
        {simulation && (
          <SimulationToolbarGroup
            simulateServerFault={simulation.simulateServerFault}
            onToggleServerFault={simulation.onToggleServerFault}
            onResetMockData={simulation.onResetMockData}
            resetButtonLabel={simulation.resetButtonLabel ?? 'Recargar datos'}
          />
        )}

        <Link to={APP_ROUTES.ACADEMIC_OFFER} className={styles.auditBtn}>
          Oferta académica
        </Link>
        <Link to={APP_ROUTES.ADMIN_TEACHER_ASSIGNMENTS} className={styles.auditBtn}>
          Docentes
        </Link>
        <Link to={APP_ROUTES.ADMIN_STUDENTS} className={styles.auditBtn}>
          Alumnos
        </Link>
        <Link to={APP_ROUTES.ADMIN_RECORDS} className={styles.auditBtn}>
          Actas
        </Link>

        {audit && (
          <button
            type="button"
            onClick={audit.onOpenAuditDrawer}
            className={styles.auditBtn}
          >
            Auditoría ({audit.auditCount})
            {audit.unreadAuditCount > 0 && (
              <span className={styles.unreadDot}>+{audit.unreadAuditCount}</span>
            )}
          </button>
        )}

        <UserProfilePill />
      </div>
    </header>
  )
}
