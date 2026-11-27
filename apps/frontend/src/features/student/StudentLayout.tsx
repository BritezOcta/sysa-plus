import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Icon } from "../../components/Icon";
import { useStudentNotifications } from "./StudentNotificationsContext";
import { ALL_ITEMS, HOME_ITEM, NAV_GROUPS, type NavItem } from "./nav";
import { useTheme } from "./useTheme";
import styles from "./StudentLayout.module.css";

export interface StudentUser {
  nombre: string;
  apellido: string;
  legajo: string;
  iniciales: string;
}

interface Props {
  user: StudentUser;
  /** Se llama al tocar "Salir": limpiá el token/sesión y redirigí al login. */
  onLogout: () => void;
  hayRelevamientoPendiente?: boolean;
}

/** Marco del área del alumno: el AppShell común con su menú y modo oscuro. */
export function StudentLayout({
  user,
  onLogout,
  hayRelevamientoPendiente = false,
}: Props) {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { unreadCount: avisosSinLeer } = useStudentNotifications();

  const normalized = pathname.replace(/\/$/, "") || "/alumno";
  const current = ALL_ITEMS.find((i) => i.to === normalized) ?? HOME_ITEM;

  // Cerrar el menú móvil al navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const badgeFor = (item: NavItem): string | null => {
    if (item.badge === "avisos" && avisosSinLeer > 0)
      return String(avisosSinLeer);
    if (item.badge === "pendiente" && hayRelevamientoPendiente)
      return "Pendiente";
    return null;
  };

  return (
    <AppShell
      navGroups={NAV_GROUPS}
      homeItem={HOME_ITEM}
      crumbRoot="Autogestión alumno"
      allowDarkMode
      user={{
        name: `${user.nombre} ${user.apellido}`,
        meta: `Legajo ${user.legajo}`,
        initials: user.iniciales,
      }}
      onLogout={onLogout}
      badgeFor={badgeFor}
    />
  );
}
