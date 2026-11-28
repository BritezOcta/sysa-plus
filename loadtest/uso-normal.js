// Escenario 1 · Uso normal: alumnos navegando el sistema, con pausas como una persona.
// Sube la cantidad de usuarios simultáneos por escalones y mide en cuál se degrada.
//
//   pnpm carga:normal                         (escalones hasta 200 usuarios)
//   pnpm carga:normal -e MAX_USUARIOS=400     (otro máximo; necesita al menos ese número de alumnos o los repite)
import http from "k6/http";
import { check, group, sleep } from "k6";
import { BASE_URL, SESSION_COOKIE, STUDENTS, dniFor, login, withSession } from "./lib.js";

const MAX = Number(__ENV.MAX_USUARIOS || 200);
const step = (fraction) => Math.max(1, Math.round(MAX * fraction));

export const options = {
  // Escalones del 5%, 25%, 50% y 100% del máximo (con 200: 10, 50, 100, 200), 2 minutos cada uno.
  stages: [
    { duration: "30s", target: step(0.05) },
    { duration: "2m", target: step(0.05) },
    { duration: "30s", target: step(0.25) },
    { duration: "2m", target: step(0.25) },
    { duration: "30s", target: step(0.5) },
    { duration: "2m", target: step(0.5) },
    { duration: "30s", target: MAX },
    { duration: "2m", target: MAX },
    { duration: "30s", target: 0 },
  ],
  // Objetivo: el 95% de las respuestas en menos de 1 s y menos del 1% de errores.
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

// Token de sesión de este usuario virtual. Se manda a mano porque con NODE_ENV=production la cookie
// es Secure y k6 no la reenvía por http:// (los navegadores hacen una excepción solo con localhost).
let session = null;

/** Una pantalla: sus requests salen en paralelo, como en el navegador, y después el alumno lee un rato. */
function screen(name, paths) {
  group(name, () => {
    const responses = http.batch(
      paths.map((p) => ["GET", `${BASE_URL}/api${p}`, null, withSession(session, { tags: { name: p } })]),
    );
    responses.forEach((r, i) => check(r, { [`${paths[i]} 200`]: (res) => res.status === 200 }));
  });
  sleep(2 + Math.random() * 3);
}

export default function () {
  // Cada usuario virtual es un alumno distinto e inicia sesión una sola vez.
  if (session === null) {
    const cookie = login(dniFor(((__VU - 1) % STUDENTS) + 1)).cookies[SESSION_COOKIE];
    if (!cookie) return sleep(5); // el check "login 200" ya registró la falla; reintenta en la próxima iteración
    session = cookie[0].value;
    sleep(1);
  }

  screen("Inicio", ["/auth/me", "/academic-status", "/notifications"]);
  screen("Estado académico", ["/academic-status"]);
  screen("Asistencias", ["/student/attendance"]);
  screen("Cursado", ["/student/courses"]);
  screen("Inscripción a cursado", ["/course-enrollments"]);
  screen("Exámenes", ["/exam-enrollments"]);
}
