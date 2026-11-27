import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Icon } from "../../components/Icon";
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
  avisosSinLeer?: number;
  hayRelevamientoPendiente?: boolean;
}

export function StudentLayout({
  user,
  onLogout,
  avisosSinLeer = 0,
  hayRelevamientoPendiente = false,
}: Props) {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

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
    if (item.badge === "avisos" && avisosSinLeer > 0) return String(avisosSinLeer);
    if (item.badge === "pendiente" && hayRelevamientoPendiente) return "Pendiente";
    return null;
  };

  return (
    <div className={`sysa-student ${styles.shell}`} data-theme={theme}>
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
          {NAV_GROUPS.map((group, i) => (
            <div key={group.title ?? `g${i}`}>
              {group.title && <div className={styles.groupTitle}>{group.title}</div>}
              {group.items.map((item) => {
                const badge = badgeFor(item);
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.id === "inicio"}
                    className={({ isActive }) =>
                      isActive ? `${styles.link} ${styles.active}` : styles.link
                    }
                  >
                    <Icon name={item.icon} size={19} />
                    <span className={styles.linkLabel}>{item.label}</span>
                    {badge && (
                      <span
                        className={`${styles.badge} ${item.badge === "pendiente" ? styles.badgeWarn : ""}`}
                      >
                        {badge}
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
            <span className={styles.crumbRoot}>Autogestión alumno</span>
            <span className={styles.crumbSep}>/</span>
            <strong>{current.label}</strong>
          </div>
          <div className={styles.spacer} />
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggle}
            aria-label={theme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
            title={theme === "light" ? "Tema oscuro" : "Tema claro"}
          >
            <Icon name={theme === "light" ? "moon" : "sun"} size={19} />
          </button>
          <div className={styles.user}>
            <div className={styles.avatar}>{user.iniciales}</div>
            <div className={styles.userText}>
              <span className={styles.userName}>
                {user.nombre} {user.apellido}
              </span>
              <span className={styles.userMeta}>Legajo {user.legajo}</span>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
