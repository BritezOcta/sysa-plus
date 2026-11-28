// Datos compartidos por los escenarios. Tienen que coincidir con apps/backend/prisma/seed-carga.ts.
import http from "k6/http";
import { check } from "k6";

/** Dentro de Docker (docker compose run k6) nginx es "frontend". Desde fuera: -e BASE_URL=http://localhost */
export const BASE_URL = __ENV.BASE_URL || "http://frontend";
/** Cantidad de alumnos que creó el seed (CARGA_ALUMNOS). */
export const STUDENTS = Number(__ENV.ALUMNOS || 500);
export const PASSWORD = "Carga123!";
const DNI_BASE = 70000000;
export const SESSION_COOKIE = "sysaplus_session";

/** DNI del alumno n (1..STUDENTS). */
export function dniFor(n) {
  return String(DNI_BASE + n);
}

export function login(dni) {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ dni, password: PASSWORD }), {
    headers: { "Content-Type": "application/json" },
    tags: { name: "login" },
  });
  check(res, { "login 200": (r) => r.status === 200 });
  return res;
}

/** Cookie de sesión explícita (replace: pisa la que haya en el cookie jar del VU). */
export function withSession(token, params = {}) {
  return { ...params, cookies: { [SESSION_COOKIE]: { value: token, replace: true } } };
}
