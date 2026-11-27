import { AppShell } from "../../components/layout/AppShell";
import { HOME_ITEM, NAV_GROUPS, type NavItem } from "./nav";

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

/** Marco del área del alumno: el AppShell común con su menú y modo oscuro. */
export function StudentLayout({
  user,
  onLogout,
  avisosSinLeer = 0,
  hayRelevamientoPendiente = false,
}: Props) {
  const badgeFor = (item: NavItem) => {
    if (item.badge === "avisos" && avisosSinLeer > 0) return { text: String(avisosSinLeer), warn: false };
    if (item.badge === "pendiente" && hayRelevamientoPendiente) return { text: "Pendiente", warn: true };
    return null;
  };

  return (
    <AppShell
      navGroups={NAV_GROUPS}
      homeItem={HOME_ITEM}
      crumbRoot="Autogestión alumno"
      allowDarkMode
      user={{ name: `${user.nombre} ${user.apellido}`, meta: `Legajo ${user.legajo}`, initials: user.iniciales }}
      onLogout={onLogout}
      badgeFor={badgeFor}
    />
  );
}
