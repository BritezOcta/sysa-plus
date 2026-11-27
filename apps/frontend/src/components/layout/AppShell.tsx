import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Icon } from "../Icon";
import { AccessibilityMenu } from "../../accessibility/AccessibilityMenu";
import { useTheme } from "../../features/student/useTheme";
import type { NavGroup, NavItem } from "./navTypes";
import styles from "./AppShell.module.css";

export interface AppShellUser {
  name: string;
  /** Segunda línea bajo el nombre: "Legajo …" en el alumno, el rol en los demás. */
  meta: string;
  initials: string;
}

export interface AppShellProps {
  /** El primer ítem del primer grupo es el inicio del rol. */
  navGroups: NavGroup[];
  /** Fallback de la ubicación y ruta que se marca con coincidencia exacta. */
  homeItem: NavItem;
  /** Raíz de la ubicación en la barra superior, p. ej. "Autogestión alumno". */
  crumbRoot: string;
  /** Solo el alumno ofrece modo oscuro; los demás roles se ven siempre en claro. */
  allowDarkMode: boolean;
  user: AppShellUser;
  /** Se llama al tocar "Salir": limpiá la sesión y redirigí al login. */
  onLogout: () => void;
  badgeFor?: (item: NavItem) => { text: string; warn: boolean } | null;
  /** Contenido extra de la barra superior, antes del usuario (p. ej. la campana de notificaciones). */
  topbarExtra?: ReactNode;
}

/** Marco común de la aplicación: menú lateral, barra superior y contenido (<Outlet />). */
export function AppShell(props: AppShellProps) {
  // El tema guardado solo se lee donde se ofrece; si no, siempre claro.
  return props.allowDarkMode ? <ThemedShell {...props} /> : <Shell {...props} theme="light" />;
}

function ThemedShell(props: AppShellProps) {
  const { theme, toggle } = useTheme();
  return <Shell {...props} theme={theme} onToggleTheme={toggle} />;
}

function Shell({
  navGroups,
  homeItem,
  crumbRoot,
  allowDarkMode,
  user,
  onLogout,
  badgeFor,
  topbarExtra,
  theme,
  onToggleTheme,
}: AppShellProps & { theme: "light" | "dark"; onToggleTheme?: () => void }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);

  const allItems = navGroups.flatMap((g) => g.items);
  const normalized = pathname.replace(/\/$/, "") || homeItem.to;
  const current = allItems.find((i) => i.to === normalized) ?? homeItem;

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

  return (
    <div className={`sysa-app ${allowDarkMode ? "sysa-student " : ""}${styles.shell}`} data-theme={theme}>
      <aside
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}
        aria-label="Menú principal"
      >
        <div className={styles.brand}>
          <div className={styles.logo}>S+</div>
          <div>
            <div className={styles.brandName}>SysA+</div>
            <span className={styles.brandTag}>UTN · FRGP</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {navGroups.map((group, i) => (
            <div key={group.title ?? `g${i}`}>
              {group.title && <div className={styles.groupTitle}>{group.title}</div>}
              {group.items.map((item) => {
                const badge = badgeFor?.(item) ?? null;
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.to === homeItem.to}
                    className={({ isActive }) =>
                      isActive ? `${styles.link} ${styles.active}` : styles.link
                    }
                  >
                    <Icon name={item.icon} size={19} />
                    <span className={styles.linkLabel}>{item.label}</span>
                    {badge && (
                      <span className={`${styles.badge} ${badge.warn ? styles.badgeWarn : ""}`}>
                        {badge.text}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.logout} onClick={onLogout}>
            <Icon name="logout" size={19} />
            Salir
          </button>
        </div>
      </aside>

      {open && <div className={styles.scrim} onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <Icon name="menu" size={22} />
          </button>
          <div className={styles.crumb}>
            <span className={styles.crumbRoot}>{crumbRoot}</span>
            <span className={styles.crumbSep}>/</span>
            <strong>{current.label}</strong>
          </div>
          <div className={styles.spacer} />
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setA11yOpen(true)}
            aria-label="Opciones de accesibilidad"
            aria-haspopup="dialog"
            aria-expanded={a11yOpen}
            title="Accesibilidad"
          >
            <Icon name="accessibility" size={19} />
          </button>
          {onToggleTheme && (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={onToggleTheme}
              aria-label={theme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
              title={theme === "light" ? "Tema oscuro" : "Tema claro"}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} size={19} />
            </button>
          )}
          {topbarExtra}
          <div className={styles.user}>
            <div className={styles.avatar}>{user.initials}</div>
            <div className={styles.userText}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userMeta}>{user.meta}</span>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {a11yOpen && <AccessibilityMenu onClose={() => setA11yOpen(false)} />}
    </div>
  );
}
