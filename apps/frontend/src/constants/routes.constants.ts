import type { UserRole } from "../types/auth.types";

export const APP_ROUTES = {
  HOME: "/",
  ACADEMIC_OFFER: "/oferta-academica",
  ENROLLMENT: "/inscripcion-cursada",
  LOGIN: "/login",
  STUDENT_AREA: "/alumno",
  STUDENT_ATTENDANCE: "/alumno/asistencias",
  TEACHER_AREA: "/profesor",
  TEACHER_ATTENDANCE: "/profesor/asistencias",
  TEACHER_GRADES: "/profesor/notas",
  TEACHER_STUDENTS: "/profesor/alumnos",
  ADMIN_STUDENTS: "/admin/alumnos",
  CHANGE_PASSWORD: "/cuenta/contrasena",
} as const;

export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  ALUMNO: APP_ROUTES.STUDENT_AREA,
  PROFESOR: APP_ROUTES.TEACHER_AREA,
  ADMINISTRADOR: APP_ROUTES.ACADEMIC_OFFER,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ALUMNO: "Alumno",
  PROFESOR: "Profesor",
  ADMINISTRADOR: "Administrador/Director",
};
