# Veredicto Fase 1 (intento 1): RECHAZADO

Emitido por el agente `juez-carga` el 2026-11-27, sobre `loadtest/criterios/fase-1.md`.

| # | Criterio | Valor medido | Línea base | Cumple |
|---|---|---|---|---|
| D1 | `inscripciones_ok` count == 50 | 50 | 50 | ✅ |
| D2 | `errores_inesperados` count == 0 | 0 | 2 | ✅ |
| D3 | `abandonos_tras_reintentos` count == 0 | 0 | 0 | ✅ |
| D4 | Login masivo `http_req_failed` == 0 | 0 (0 de 500) | 0 | ✅ |
| D5 | `checks` fails == 0 (los tres) | 0 / 0 / 0 | 0 / 0 | ✅ |
| R1 | `http_req_duration{name:inscribir}` p(95) < 2000 ms | 10175.92 ms | 25720.75 ms | ❌ |
| R2 | avisos / 500 < 5% | 0% | 20,4% | ✅ |
| R3 | `http_req_duration{name:login}` p(95) < 3000 ms | 2896.89 ms | 33303.87 ms | ✅ |
| R4 | Uso normal p(95) <= 93.6 ms | 66.91 ms | 78 ms | ✅ |
| R5 | Uso normal `http_req_failed` == 0 | 0 (0 de 21.312) | 0 | ✅ |

## Fundamento

R1 falla: p(95) de 10175.92 ms, cinco veces el límite. Mejoró un 60% respecto de la línea base,
pero no cumple, y la fase se rechaza aunque los otros nueve criterios se cumplan.

## Observaciones del juez

- Latencias del pico agrupadas cerca de 10 s (mínimo 3,9 s): parece cola o espera, no costo variable.
- `http_reqs` = 1001 en el pico, uno más de lo esperado.
- D5 en el pico cubre solo el login del setup: las inscripciones no tienen check.
- R3 cumple con 3,4% de margen.
- Los JSON del pico contienen los tokens de sesión de los 500 alumnos de carga (`setup_data`).

## Notas del implementador (no forman parte del veredicto)

- El agrupamiento en ~10 s coincide con la medición de CPU durante el pico: el backend saturó un núcleo
  (~110%) mientras SQL Server no pasó de 117% de 1600%. Node atiende los 500 pedidos intercalados, así
  que todos terminan cerca del final. Con un solo proceso, R1 no es alcanzable; requiere varias instancias.
- El request de más es el `GET /course-enrollments` del setup, que busca la comisión PICO: 500 logins
  + 1 consulta + 500 inscripciones = 1001. No hay reintentos sin contar.
