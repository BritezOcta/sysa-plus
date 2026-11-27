import { Outlet, useNavigate } from "react-router";
import { useAuth, useAuthenticatedUser } from "../../auth/AuthContext";
import { APP_ROUTES, ROLE_LABELS } from "../../constants";
import { getUserFullName, getUserInitials } from "../../helpers/UserDisplayHelper";
import NotificationBell from "../ui/NotificationBell";
import { AppShell } from "./AppShell";
import type { NavGroup, NavItem } from "./navTypes";
import { ADMIN_HOME, ADMIN_NAV_GROUPS, TEACHER_HOME, TEACHER_NAV_GROUPS } from "./roleNav";

/** Marco de Administrador o Profesor: siempre en modo claro. */
function StaffShell({ navGroups, homeItem, crumbRoot }: { navGroups: NavGroup[]; homeItem: NavItem; crumbRoot: string }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useAuthenticatedUser();

  async function handleLogout() {
    await logout();
    navigate(APP_ROUTES.LOGIN, { replace: true });
  }

  return (
    <AppShell
      navGroups={navGroups}
      homeItem={homeItem}
      crumbRoot={crumbRoot}
      allowDarkMode={false}
      user={{ name: getUserFullName(user), meta: ROLE_LABELS[user.role], initials: getUserInitials(user) }}
      onLogout={() => void handleLogout()}
      topbarExtra={<NotificationBell />}
    />
  );
}

export function AdminShell() {
  return <StaffShell navGroups={ADMIN_NAV_GROUPS} homeItem={ADMIN_HOME} crumbRoot="Administración" />;
}

export function TeacherShell() {
  return <StaffShell navGroups={TEACHER_NAV_GROUPS} homeItem={TEACHER_HOME} crumbRoot="Área docente" />;
}

/**
 * Cambio de contraseña de Profesor y Administrador. Con la contraseña restablecida
 * (mustChangePassword) se muestra sin menú: el backend rechaza cualquier otra pantalla.
 */
export function AccountShell() {
  const user = useAuthenticatedUser();
  if (user.mustChangePassword) return <Outlet />;
  return user.role === "ADMINISTRADOR" ? <AdminShell /> : <TeacherShell />;
}
