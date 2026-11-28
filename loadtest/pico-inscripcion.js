// Escenario 2 · Pico de inscripción: muchos alumnos se anotan a la misma comisión en el mismo instante.
// Mide los tiempos bajo contención y verifica que el cupo se respete: nunca más inscriptos que el cupo.
//
//   pnpm carga:seed      (antes de CADA corrida: deja la comisión PICO vacía)
//   pnpm carga:pico      (300 alumnos contra cupo 50)
//   pnpm carga:pico -e USUARIOS=500 -e CUPO=80   (si el seed se corrió con CARGA_CUPO_PICO=80)
//
// Cada alumno inicia sesión por su cuenta y todos esperan una hora de largada común: así el pico
// mide solo la inscripción, y los tokens de sesión no quedan en el resumen exportado (setup_data).
import http from "k6/http";
import { check, fail, sleep } from "k6";
import { Counter } from "k6/metrics";
import { BASE_URL, SESSION_COOKIE, STUDENTS, dniFor, login, withSession } from "./lib.js";

const USERS = Number(__ENV.USUARIOS || Math.min(STUDENTS, 300));
const CAPACITY = Number(__ENV.CUPO || 50);
/** Segundos desde el setup hasta la largada: tiempo para que inicien sesión todos los alumnos. */
const WAIT_S = Number(__ENV.ESPERA_S || 30);
/** Reintentos ante "Muchos alumnos se están inscribiendo... Intentá nuevamente", como haría el alumno. */
const MAX_RETRIES = 5;

const enrolled = new Counter("inscripciones_ok");
const full = new Counter("rechazos_sin_cupo");
const busy = new Counter("avisos_intente_nuevamente");
const saturated = new Counter("avisos_sistema_saturado");
const gaveUp = new Counter("abandonos_tras_reintentos");
const unexpected = new Counter("errores_inesperados");
/** Alumnos que terminaron de iniciar sesión después de la largada: el pico fue menos simultáneo. */
const late = new Counter("llegadas_tarde");

if (USERS > STUDENTS) throw new Error(`USUARIOS (${USERS}) no puede superar ALUMNOS (${STUDENTS})`);

export const options = {
  setupTimeout: "2m",
  scenarios: {
    pico: { executor: "per-vu-iterations", vus: USERS, iterations: 1, maxDuration: `${WAIT_S + 150}s` },
  },
  thresholds: {
    // El cupo se respeta: entran exactamente CAPACITY alumnos (o todos, si son menos).
    inscripciones_ok: [`count==${Math.min(USERS, CAPACITY)}`],
    errores_inesperados: ["count==0"],
    abandonos_tras_reintentos: ["count==0"],
    llegadas_tarde: ["count==0"],
    "http_req_duration{name:inscribir}": ["p(95)<2000"],
  },
};

export function setup() {
  // Un alumno cualquiera alcanza para ubicar la comisión; su token no sale de setup().
  const res = login(dniFor(1));
  const cookie = res.cookies[SESSION_COOKIE];
  if (!cookie) {
    fail(`No pudo iniciar sesión el alumno ${dniFor(1)} (HTTP ${res.status}: ${String(res.body).slice(0, 200)}). ¿Corriste el seed de carga?`);
  }

  const overview = http.get(`${BASE_URL}/api/course-enrollments`, withSession(cookie[0].value));
  const peak = (overview.json("subjects") || []).flatMap((s) => s.commissions).find((c) => c.name === "PICO");
  if (!peak) fail("No se encontró la comisión PICO. Corré el seed de carga (pnpm carga:seed).");
  if (peak.capacity !== CAPACITY) fail(`La comisión PICO tiene cupo ${peak.capacity}; pasá -e CUPO=${peak.capacity}.`);
  if (peak.enrolledCount > 0) fail("La comisión PICO ya tiene inscriptos. Volvé a correr el seed antes de repetir la prueba.");

  return { offeringId: peak.courseOfferingId, startAt: Date.now() + WAIT_S * 1000 };
}

export default function (data) {
  const cookie = login(dniFor(__VU)).cookies[SESSION_COOKIE];
  if (!cookie) return unexpected.add(1); // el check "login 200" ya registró la falla

  const waitMs = data.startAt - Date.now();
  if (waitMs > 0) sleep(waitMs / 1000);
  else late.add(1);

  const body = JSON.stringify({ courseOfferingId: data.offeringId });
  const params = withSession(cookie[0].value, {
    headers: { "Content-Type": "application/json" },
    tags: { name: "inscribir" },
    // 409 (sin cupo / intentá nuevamente) y 503 (saturado) son respuestas previstas, no fallas de HTTP.
    responseCallback: http.expectedStatuses(201, 409, 503),
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = http.post(`${BASE_URL}/api/course-enrollments`, body, params);
    const code = res.status === 409 || res.status === 503 ? res.json("code") : null;
    const final = res.status === 201 || code === "COMMISSION_FULL";
    const retry = code === "CONCURRENT_UPDATE" || code === "SERVICE_BUSY";
    check(res, { "inscripción: respuesta prevista": () => final || retry });

    if (res.status === 201) return enrolled.add(1);
    if (code === "COMMISSION_FULL") return full.add(1);
    if (!retry) {
      unexpected.add(1);
      return console.warn(`Respuesta inesperada ${res.status}: ${res.body}`);
    }
    (code === "CONCURRENT_UPDATE" ? busy : saturated).add(1);
    sleep(0.5 + Math.random()); // el alumno lee el aviso y vuelve a tocar "Inscribirme"
  }
  gaveUp.add(1);
}
