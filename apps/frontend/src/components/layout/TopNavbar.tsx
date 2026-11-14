import utnLogo from '../../assets/images/utn-logotipo.svg'
import { INSTITUTION_BRAND } from '../../constants'
import styles from '../../pages/AcademicManagementPage.module.css'
import SimulationToolbarGroup from './SimulationToolbarGroup'
import UserProfilePill from './UserProfilePill'

interface TopNavbarProps {
  simulateServerFault: boolean
  onToggleServerFault: (enabled: boolean) => void
  onResetMockData: () => void
  auditCount: number
  unreadAuditCount: number
  onOpenAuditDrawer: () => void
}

export default function TopNavbar({
  simulateServerFault,
  onToggleServerFault,
  onResetMockData,
  auditCount,
  unreadAuditCount,
  onOpenAuditDrawer,
}: TopNavbarProps) {
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
        <SimulationToolbarGroup
          simulateServerFault={simulateServerFault}
          onToggleServerFault={onToggleServerFault}
          onResetMockData={onResetMockData}
        />

        <button
          type="button"
          onClick={onOpenAuditDrawer}
          className={styles.auditBtn}
        >
          Auditoría ({auditCount})
          {unreadAuditCount > 0 && (
            <span className={styles.unreadDot}>+{unreadAuditCount}</span>
          )}
        </button>

        <UserProfilePill />
      </div>
    </header>
  )
}
