import type { IconName } from "../../components/Icon";

export interface NavItem {
  /** También es el segmento de ruta: /alumno/<id> */
  id: string;
  label: string;
  to: string;
  icon: IconName;
  description: string;
  badge?: "avisos" | "pendiente";
}

export interface NavGroup {
  title: string | null;
  items: NavItem[];
}

const item = (
  id: string,
  label: string,
  icon: IconName,
  description: string,
  badge?: NavItem["badge"],
): NavItem => ({ id, label, to: `/alumno/${id}`, icon, description, badge });

export const HOME_ITEM: NavItem = {
  id: "inicio",
  label: "Inicio",
  to: "/alumno",
  icon: "home",
  description: "Resumen de tu situación académica",
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    items: [
      HOME_ITEM,
      item(
        "avisos",
        "Avisos",
        "bell",
        "Comunicados de la facultad y de tus cátedras",
        "avisos",
      ),
    ],
  },
  {
    title: "Académico",
    items: [
      item(
        "plan",
        "Materias del plan",
        "book",
        "Todas las materias de tu plan de estudios y su estado",
      ),
      item(
        "estado",
        "Estado académico",
        "chart",
        "Tu avance, promedio y materias aprobadas",
      ),
      item(
        "examenes",
        "Exámenes",
        "fileText",
        "Historial de exámenes rendidos y sus resultados",
      ),
      item(
        "cursado",
        "Cursado / Notas de parciales / Encuestas",
        "pencil",
        "Tus cursadas actuales, notas de parciales y encuestas docentes",
      ),
      item(
        "asistencias",
        "Asistencias",
        "clipboardList",
        "Consultá tu porcentaje y registro de asistencias por materia",
      ),
      item(
        "correlatividad-cursar",
        "Correlatividad para cursar",
        "link",
        "Qué necesitás tener aprobado o regular para cursar cada materia",
      ),
      item(
        "correlatividad-rendir",
        "Correlatividad para rendir",
        "flag",
        "Qué necesitás tener aprobado para rendir cada final",
      ),
    ],
  },
  {
    title: "Inscripciones",
    items: [
      item(
        "inscripcion-examen",
        "Inscripción a examen",
        "calendarCheck",
        "Anotate a las mesas de examen disponibles",
      ),
      item(
        "inscripcion-cursado",
        "Inscripción a cursado",
        "calendarPlus",
        "Anotate a las comisiones del próximo cuatrimestre",
      ),
    ],
  },
  {
    title: "Trámites",
    items: [
      item(
        "certificados",
        "Descarga de certificados",
        "download",
        "Certificado de alumno regular y otras constancias",
      ),
      item(
        "bee",
        "Boleto Especial Educativo",
        "bus",
        "Solicitá o renová tu boleto estudiantil",
      ),
      item(
        "censo",
        "Relevamiento de datos censales 2026",
        "clipboardList",
        "Actualizá tus datos personales y académicos",
        "pendiente",
      ),
      item(
        "password",
        "Cambio de contraseña",
        "lock",
        "Actualizá la contraseña de tu cuenta",
      ),
    ],
  },
];

export const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function getNavItem(id: string): NavItem | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}
