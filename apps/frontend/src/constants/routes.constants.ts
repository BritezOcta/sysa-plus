import type { UserRole } from "../types/auth.types";

export const APP_ROUTES = {
  HOME: "/",
  ACADEMIC_OFFER: "/oferta-academica",
  ENROLLMENT: "/inscripcion-cursada",
  LOGIN: "/login",
  STUDENT_AREA: "/alumno",
  TEACHER_AREA: "/profesor",
  TEACHER_ATTENDANCE: "/profesor/asistencias",
  TEACHER_GRADES: "/profesor/notas",
  TEACHER_STUDENTS: "/profesor/alumnos",
} as const;

/** Vista principal de cada rol después de iniciar sesión (RF-01). */
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
