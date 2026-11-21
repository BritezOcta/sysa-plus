export const ROLES = {
  ALUMNO: "ALUMNO",
  PROFESOR: "PROFESOR",
  ADMINISTRADOR: "ADMINISTRADOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isRole(value: string): value is Role {
  return Object.values(ROLES).includes(value as Role);
}

/** Datos del usuario autenticado que se adjuntan a req.user y se devuelven al frontend. */
export interface AuthUser {
  userId: number;
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  /** Solo para ALUMNO */
  legajo: string | null;
}

export interface SessionTokenPayload {
  sub: string;
  role: Role;
}
