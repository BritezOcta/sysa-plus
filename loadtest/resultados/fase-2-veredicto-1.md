# Veredicto Fase 2 (intento 1): RECHAZADO

Emitido por el agente `juez-carga` el 2026-11-28, sobre `loadtest/criterios/fase-2.md`.

| # | Criterio | Valor medido | Línea base (Fase 1) | Cumple |
|---|---|---|---|---|
| V1 | `llegadas_tarde` == 0 | 0 | — | ✅ |
| V2 | `vus_max` == 500 (pico) | 500 | 500 | ✅ |
| V3 | `fase-2-cpu.txt` existe | 30 muestras | — | ✅ |
| D1 | `inscripciones_ok` == 50 | 50 | 50 | ✅ |
| D2 | `errores_inesperados` == 0 | 0 | 0 | ✅ |
| D3 | `abandonos_tras_reintentos` == 0 | 0 | 0 | ✅ |
| D4 | Login `http_req_failed` == 0 | 0 (de 500) | 0 | ✅ |
| D5 | `checks` fails == 0 | 0 en los cuatro archivos | 0 | ✅ |
| D6 | Uso normal 500 `http_req_failed` == 0 | 0 (de 53.260) | 0 (de 40.092) | ✅ |
| R1 | Pico p(95) de inscripción < 2000 ms | **4038.72 ms** | 10175.92 ms (−60%) | ❌ |
| R2 | avisos / 500 < 5% | 0% | 0% | ✅ |
| R3 | Login masivo p(95) < 3000 ms | 2781.86 ms | 2896.89 ms (−4%) | ✅ |
| R4 | Uso normal 200 p(95) <= 80.3 ms | 26.50 ms | 66.91 ms (−60%) | ✅ |
| R5 | Uso normal 200 `http_req_failed` == 0 | 0 (de 21.384) | 0 | ✅ |
| R6 | Uso normal 500 p(95) < 1000 ms | 39.58 ms | 3894.37 ms (−99%) | ✅ |

## Fundamento

R1 falla: p(95) de 4038.72 ms, el doble del límite (mínimo 2934.71 ms, mediana 3785.63 ms). Mejoró
un 60% respecto de la Fase 1, pero no cumple. La corrida es válida y todos los criterios duros pasan.

## Observaciones del juez y su tratamiento

| Observación | Tratamiento |
|---|---|
| En la ráfaga de inscripción el backend llega a ~500–600% y el host a 72%; en la de login el host llega a 96%. k6 corre en la misma PC y compite por la CPU. | Coincide con la investigación (abajo). |
| Hay un solo contenedor de backend; los criterios hablan de "varias instancias detrás de nginx (`upstream`)". | Desvío de implementación, no del objetivo: las instancias son 4 workers de `node:cluster` dentro del contenedor (`WEB_CONCURRENCY=4`; los logs muestran 4 "running at (worker N)"). Evita cambiar nombres de contenedor y nginx. Queda registrado acá. |
| D5 dice "los tres" pero hay cuatro archivos. | Redacción a corregir en los criterios de la próxima fase. |
| El login apenas mejoró (−4%), a 218 ms del límite. | Con 4 workers el login sigue saturando el host (96%): es CPU de bcrypt. |
| R2 pasa porque las métricas de avisos no existen. | Los contadores de k6 solo aparecen en el resumen si se incrementan alguna vez; el script los sigue registrando (ver `pico-inscripcion.js`). |
| 1002 requests y 1001 checks en el pico. | El request sin check es el `GET /course-enrollments` del setup que ubica la comisión PICO. |

## Investigación del pico (notas del implementador, no forman parte del veredicto)

Lo que se probó para R1, con medición antes y después:

| Hipótesis / cambio | Resultado del p95 del pico |
|---|---|
| 4 workers (node:cluster) | 10,2 s → 4,3 s |
| 8 workers | sin mejora (4,3 s; luego 4,1 s con el resto de los cambios) |
| `READ_COMMITTED_SNAPSHOT` (lecturas sin esperar a escrituras) | 4,3 s → 3,7 s |
| Pool de conexiones frío tras la espera | descartado (5 s vs 30 s de espera: igual) |
| Inscripción en una sola ida a la base (`reserveCourseSeat`) | sin mejora apreciable (3,4–4,0 s) |

Mediciones de apoyo:
- nginx (`$upstream_response_time`): todo el tiempo ocurre dentro de Node; conexión y red, ~1 ms.
- SQL Server (`sys.dm_exec_query_stats`): todas las consultas < 1 ms salvo la espera por el bloqueo de la
  comisión (prom. 422 ms, máx. 602 ms, solo 112 transacciones).
- Escala con la cantidad de alumnos: 100 → 1,8 s; 250 → 2,9 s; 500 → 3,9 s (mínimo de 1,4 s ya con 100).

Siguiente paso propuesto: perfilar la CPU de un worker durante la ráfaga para ver en qué se van los
~30 ms de CPU por inscripción, en lugar de seguir probando hipótesis.
