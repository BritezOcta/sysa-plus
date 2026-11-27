import { APP_ROUTES } from "../../constants";
import type { NavGroup, NavItem } from "./navTypes";

const PASSWORD_ITEM: NavItem = {
  id: "password",
  label: "Contraseña",
  to: APP_ROUTES.CHANGE_PASSWORD,
  icon: "lock",
  description: "Actualizá la contraseña de tu cuenta",
};

/* ---------- Administrador/Director ---------- */

export const ADMIN_HOME: NavItem = {
  id: "oferta-academica",
  label: "Oferta académica",
  to: APP_ROUTES.ACADEMIC_OFFER,
  icon: "book",
  description: "Carreras, materias y correlatividades",
};

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  { title: null, items: [ADMIN_HOME] },
  {
    title: "Gestión académica",
    items: [
      { id: "docentes", label: "Docentes", to: APP_ROUTES.ADMIN_TEACHER_ASSIGNMENTS, icon: "clipboardList", description: "Asignación de docentes a comisiones" },
      { id: "inscripciones", label: "Inscripciones y calendario", to: APP_ROUTES.ADMIN_ENROLLMENT, icon: "calendarPlus", description: "Períodos, comisiones, turnos y mesas" },
    ],
  },
  {
    title: "Alumnos y actas",
    items: [
      { id: "alumnos", label: "Alumnos", to: APP_ROUTES.ADMIN_STUDENTS, icon: "fileText", description: "Alumnos por comisión y observaciones" },
      { id: "actas", label: "Actas", to: APP_ROUTES.ADMIN_RECORDS, icon: "pencil", description: "Actas cerradas y reapertura" },
    ],
  },
  {
    title: "Dirección",
    items: [
      { id: "reportes", label: "Reportes", to: APP_ROUTES.ADMIN_REPORTS, icon: "chart", description: "Reportes académicos" },
      { id: "usuarios", label: "Usuarios", to: APP_ROUTES.ADMIN_USERS, icon: "lock", description: "Usuarios, contraseñas y estado de alumnos" },
    ],
  },
  { title: "Cuenta", items: [PASSWORD_ITEM] },
];

/* ---------- Profesor ---------- */

export const TEACHER_HOME: NavItem = {
  id: "panel",
  label: "Panel docente",
  to: APP_ROUTES.TEACHER_AREA,
  icon: "home",
  description: "Tus comisiones y accesos rápidos",
};

export const TEACHER_NAV_GROUPS: NavGroup[] = [
  { title: null, items: [TEACHER_HOME] },
  {
    title: "Mis comisiones",
    items: [
      { id: "asistencias", label: "Asistencias", to: APP_ROUTES.TEACHER_ATTENDANCE, icon: "calendarCheck", description: "Registro y consulta de asistencias" },
      { id: "notas", label: "Notas y actas", to: APP_ROUTES.TEACHER_GRADES, icon: "pencil", description: "Carga de notas y cierre de actas" },
      { id: "alumnos", label: "Alumnos y observaciones", to: APP_ROUTES.TEACHER_STUDENTS, icon: "fileText", description: "Listado de alumnos y observaciones" },
    ],
  },
  { title: "Cuenta", items: [PASSWORD_ITEM] },
];
