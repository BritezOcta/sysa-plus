import type { IconName } from "../Icon";

/** Ítem del menú lateral de AppShell. */
export interface NavItem {
  /** Identificador estable; en el alumno también es el segmento de ruta: /alumno/<id> */
  id: string;
  label: string;
  to: string;
  icon: IconName;
  description: string;
  /** Clave de insignia que interpreta el `badgeFor` de cada rol (el alumno usa "avisos"). */
  badge?: string;
}

export interface NavGroup {
  title: string | null;
  items: NavItem[];
}
