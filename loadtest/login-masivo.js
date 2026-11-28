// Escenario 3 · Login masivo: muchos alumnos inician sesión en el mismo instante
// (por ejemplo, al abrir la inscripción). El login es la operación más cara en CPU (bcrypt).
//
//   pnpm carga:login                      (500 alumnos)
//   pnpm carga:login -e USUARIOS=300
import http from "k6/http";
import { check } from "k6";
import { BASE_URL, PASSWORD, STUDENTS, dniFor } from "./lib.js";

const USERS = Number(__ENV.USUARIOS || Math.min(STUDENTS, 500));
if (USERS > STUDENTS) throw new Error(`USUARIOS (${USERS}) no puede superar ALUMNOS (${STUDENTS})`);

export const options = {
  scenarios: {
    login: { executor: "per-vu-iterations", vus: USERS, iterations: 1, maxDuration: "3m" },
  },
  thresholds: {
    "http_req_duration{name:login}": ["p(95)<3000"],
    http_req_failed: ["rate==0"],
    checks: ["rate==1"],
  },
};

export default function () {
  // Sin los helpers de lib.js para no sumar el check "login 200" dos veces.
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ dni: dniFor(__VU), password: PASSWORD }), {
    headers: { "Content-Type": "application/json" },
    tags: { name: "login" },
  });
  check(res, { "login 200": (r) => r.status === 200 });
}
