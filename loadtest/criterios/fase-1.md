# Criterios de aprobación · Fase 1 (resistir picos)

Acordados el 2026-11-27, **antes** de medir, y enmendados ese mismo día **después** del primer
veredicto (ver "Cambios a los criterios"). No se modifican después de ver los resultados salvo
decisión explícita del equipo, registrada en esa sección.

**Cambios de la fase:** inscripción a cursadas y exámenes con bloqueo por fila en lugar de
transacciones SERIALIZABLE; hash de contraseñas con `bcrypt` nativo; fallas de concurrencia → 503.

**Entorno:** Docker Desktop en la PC de desarrollo, base sembrada con `pnpm carga:seed` (500 alumnos).

## Criterios duros (si uno falla, la fase se RECHAZA)

| # | Escenario | Archivo de resultados | Métrica k6 | Condición |
|---|---|---|---|---|
| D1 | Pico 500 alumnos vs cupo 50 | `pico-inscripcion.json` | `inscripciones_ok` → `count` | `== 50` (el cupo nunca se pasa ni queda sin llenar) |
| D2 | Pico | `pico-inscripcion.json` | `errores_inesperados` → `count` | `== 0` (ningún 500 ni respuesta no prevista); métrica ausente = 0 |
| D3 | Pico | `pico-inscripcion.json` | `abandonos_tras_reintentos` → `count` | `== 0`; métrica ausente = 0 |
| D4 | Login masivo 500 | `login-masivo.json` | `http_req_failed` → `value` (tasa) | `== 0` |
| D5 | Todos | los tres | `checks` → `fails` | `== 0` |

## Criterios de rendimiento (si uno falla, la fase se RECHAZA)

| # | Escenario | Archivo | Métrica k6 | Condición |
|---|---|---|---|---|
| ~~R1~~ | ~~Pico~~ | | | **Movido a la Fase 2** (ver "Cambios a los criterios") |
| R2 | Pico | `pico-inscripcion.json` | (`avisos_intente_nuevamente` + `avisos_sistema_saturado`) → `count` / 500 | `< 5%` (menos de 25 avisos); métricas ausentes = 0 |
| R3 | Login masivo | `login-masivo.json` | `http_req_duration{name:login}` → `p(95)` | `< 3000` ms |
| R4 | Uso normal, máx. 200 usuarios | `uso-normal.json` | `http_req_duration` → `p(95)` | `<= 93.6` ms (sin retroceso > 20% vs la línea base de 78 ms) |
| R5 | Uso normal | `uso-normal.json` | `http_req_failed` → `value` | `== 0` |

## Cambios a los criterios

- **2026-11-27 · R1 pasa a la Fase 2** (decisión del equipo tras el veredicto `fase-1-veredicto-1.md`).
  R1 (p95 de inscripción en el pico < 2 s) fue el único criterio que no se cumplió: 10,2 s, contra 25,7 s
  de la línea base. Durante el pico el backend saturó un núcleo (~110% de CPU) con la base holgada: el
  límite es el único proceso de Node, y repartir la carga entre procesos es justamente el alcance de la
  Fase 2. R1 se evalúa ahí, sin cambios en su umbral.

## Línea base (antes de los cambios)

- Uso normal, 200 usuarios (2026-11-27): p95 = 78 ms, 0 errores en 21.240 requests.
- Pico y login masivo con 500 usuarios: `base-pico-inscripcion.json` y `base-login-masivo.json`.
  Solo sirven de comparación: el veredicto sale de las tablas de arriba.
