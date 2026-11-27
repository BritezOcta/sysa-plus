import { Link } from "react-router";
import utnLogo from "../../assets/images/utn-logotipo.svg";
import { APP_ROUTES, INSTITUTION_BRAND } from "../../constants";
import styles from "../../pages/AcademicManagementPage.module.css";
import UserProfilePill from "./UserProfilePill";
import NotificationBell from "../ui/NotificationBell";

/**
 * Barra superior de las páginas del Administrador. El botón de recarga y el de auditoría
 * son opcionales: solo se muestran si la página los provee (Oferta académica los usa).
 */
interface TopNavbarProps {
  onReloadData?: () => void;
  resetButtonLabel?: string;
  auditCount?: number;
  unreadAuditCount?: number;
  onOpenAuditDrawer?: () => void;
}

export default function TopNavbar({
  onReloadData,
  resetButtonLabel = "Recargar datos",
  auditCount = 0,
  unreadAuditCount = 0,
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
        {onReloadData && (
          <button
            type="button"
            onClick={onReloadData}
            className={styles.resetMockBtn}
          >
            {resetButtonLabel}
          </button>
        )}

        <Link to={APP_ROUTES.ACADEMIC_OFFER} className={styles.auditBtn}>
          Oferta académica
        </Link>
        <Link
          to={APP_ROUTES.ADMIN_TEACHER_ASSIGNMENTS}
          className={styles.auditBtn}
        >
          Docentes
        </Link>
        <Link to={APP_ROUTES.ADMIN_ENROLLMENT} className={styles.auditBtn}>
          Inscripciones
        </Link>
        <Link to={APP_ROUTES.ADMIN_STUDENTS} className={styles.auditBtn}>
          Alumnos
        </Link>
        <Link to={APP_ROUTES.ADMIN_RECORDS} className={styles.auditBtn}>
          Actas
        </Link>
        <Link to={APP_ROUTES.ADMIN_REPORTS} className={styles.auditBtn}>
          Reportes
        </Link>
        <Link to={APP_ROUTES.ADMIN_USERS} className={styles.auditBtn}>
          Usuarios
        </Link>

        {onOpenAuditDrawer && (
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
        )}

        <NotificationBell />

        <UserProfilePill />
      </div>
    </header>
  );
}
