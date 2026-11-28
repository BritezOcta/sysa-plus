# Criterios de aprobación · Fase 2 (usar toda la máquina)

**Aprobados por el equipo el 2026-11-27, antes de medir.** No se modifican después de ver los
resultados salvo decisión explícita del equipo, registrada en una sección "Cambios a los criterios".

**Cambios de la fase:** varias instancias del backend detrás de nginx (`upstream`), pool de conexiones
ajustado a la cantidad de instancias y límite de login por IP compatible con varias instancias.

**Objetivo:** que el sitio soporte entre 300 y 500 usuarios simultáneos, incluido el pico de inscripción.

**Entorno:** Docker Desktop en la PC de desarrollo (16 núcleos), base sembrada con `pnpm carga:seed`
(500 alumnos). Resultados de la Fase 1 como línea base: `fase-1-*.json`.

## Criterios de validez (si uno falla, la corrida no sirve y se repite)

| # | Escenario | Archivo | Métrica k6 | Condición |
|---|---|---|---|---|
| V1 | Pico | `pico-inscripcion.json` | `llegadas_tarde` → `count` | `== 0`; métrica ausente = 0 |
| V2 | Pico | `pico-inscripcion.json` | `vus_max` → `value` | `== 500` |
| V3 | Pico | `fase-2-cpu.txt` | uso de CPU de cada contenedor durante el pico | el archivo existe (evidencia de dónde está el límite) |

## Criterios duros (si uno falla, la fase se RECHAZA)

| # | Escenario | Archivo | Métrica k6 | Condición |
|---|---|---|---|---|
| D1 | Pico 500 alumnos vs cupo 50 | `pico-inscripcion.json` | `inscripciones_ok` → `count` | `== 50` |
| D2 | Pico | `pico-inscripcion.json` | `errores_inesperados` → `count` | `== 0`; ausente = 0 |
| D3 | Pico | `pico-inscripcion.json` | `abandonos_tras_reintentos` → `count` | `== 0`; ausente = 0 |
| D4 | Login masivo 500 | `login-masivo.json` | `http_req_failed` → `value` | `== 0` |
| D5 | Todos | los tres | `checks` → `fails` | `== 0` |
| D6 | Uso normal 500 | `uso-normal-500.json` | `http_req_failed` → `value` | `== 0` |

## Criterios de rendimiento (si uno falla, la fase se RECHAZA)

| # | Escenario | Archivo | Métrica k6 | Condición |
|---|---|---|---|---|
| R1 | Pico (viene de la Fase 1) | `pico-inscripcion.json` | `http_req_duration{name:inscribir}` → `p(95)` | `< 2000` ms |
| R2 | Pico | `pico-inscripcion.json` | (`avisos_intente_nuevamente` + `avisos_sistema_saturado`) → `count` / 500 | `< 5%`; ausentes = 0 |
| R3 | Login masivo | `login-masivo.json` | `http_req_duration{name:login}` → `p(95)` | `< 3000` ms |
| R4 | Uso normal, máx. 200 | `uso-normal.json` | `http_req_duration` → `p(95)` | `<= 80.3` ms (sin retroceso > 20% vs Fase 1: 66.91 ms) |
| R5 | Uso normal, máx. 200 | `uso-normal.json` | `http_req_failed` → `value` | `== 0` |
| R6 | Uso normal, máx. **500** (`-e MAX_USUARIOS=500`) | `uso-normal-500.json` | `http_req_duration` → `p(95)` | `< 1000` ms |

## Cambios a los criterios

- **2026-11-28 · El pico se evalúa con tres corridas** (decisión del equipo tras `fase-2-veredicto-2.md`,
  **antes** de la medición que se evalúa). Con el mismo código el p95 del pico varió entre 1,73 y
  2,05 s, y el criterio suponía una sola corrida. Desde ahora:
  - El pico se corre **tres veces seguidas** sobre el mismo commit, cada una precedida por
    `pnpm carga:seed`. Se informan **las tres**; no se descarta ni se repite ninguna salvo que falle un
    criterio de validez, y en ese caso se informa también la descartada y el motivo.
  - Archivos de cada corrida *n* (1, 2, 3): `pico-inscripcion-n.json` y `fase-2-cpu-n.txt` (CPU de esa
    misma corrida). El commit medido queda anotado en `fase-2-medicion.md`.
  - **V1, V2, V3, D1, D2, D3 y R2 se exigen en cada una de las tres corridas.**
  - **R1 se evalúa con la mediana** de los tres p(95) de `http_req_duration{name:inscribir}`: `< 2000` ms.
  - D5 se exige en todos los archivos de resultados de la fase (la tabla decía "los tres").
  - Login masivo y uso normal (D4, D6, R3 a R6) siguen con una corrida cada uno, sobre el mismo commit.

## Línea base (Fase 1)

- Pico 500: p95 de inscripción 10175.92 ms, 0 errores, 0 avisos.
- Login masivo 500: p95 2896.89 ms.
- Uso normal 200: p95 66.91 ms, 0 errores en 21.312 requests.
- Uso normal 500: no se midió todavía; se mide al inicio de la fase como línea base.
