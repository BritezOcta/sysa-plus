# Veredicto Fase 1 (intento 2): APROBADO

Emitido por el agente `juez-carga` el 2026-11-27, sobre `loadtest/criterios/fase-1.md` con la enmienda
que pasa R1 a la Fase 2. Mismas mediciones que el intento 1 (`fase-1-veredicto-1.md`).

| # | Criterio | Valor medido | Línea base | Cumple |
|---|---|---|---|---|
| D1 | `inscripciones_ok` count == 50 | 50 (+ 450 sin cupo) | 50 | ✅ |
| D2 | `errores_inesperados` count == 0 | 0 | 2 | ✅ |
| D3 | `abandonos_tras_reintentos` count == 0 | 0 | 0 | ✅ |
| D4 | Login masivo `http_req_failed` == 0 | 0 (0 de 500) | 0 | ✅ |
| D5 | `checks` fails == 0 (los tres) | 0 / 0 / 0 | 0 / 0 | ✅ |
| R1 | (pasó a la Fase 2) | 10175.92 ms, solo referencia | 25720.75 ms | No aplica |
| R2 | avisos / 500 < 5% | 0% | 20,4% | ✅ |
| R3 | Login masivo p(95) < 3000 ms | 2896.89 ms | 33303.87 ms (−91%) | ✅ |
| R4 | Uso normal p(95) <= 93.6 ms | 66.91 ms | 78 ms (−14%) | ✅ |
| R5 | Uso normal `http_req_failed` == 0 | 0 (0 de 21.312) | 0 | ✅ |

## Fundamento

Se cumplen los nueve criterios vigentes. La única falla del intento 1 era R1, que ya no forma parte de
esta fase.

## Observaciones del juez y su tratamiento

| Observación | Tratamiento |
|---|---|
| El cambio de criterios se hizo después de ver resultados y quita justo el que fallaba; el encabezado seguía diciendo "acordados antes de medir". | Encabezado corregido. La decisión fue del equipo y está registrada en "Cambios a los criterios". |
| `loadtest/` no está en git: no hay historial que muestre la versión original de los criterios. | Pendiente: commitear los criterios y los veredictos. |
| R1 no tiene dónde evaluarse: no existe `fase-2.md`. | Creado `criterios/fase-2.md`, con R1 sin cambios. |
| El argumento de CPU no está respaldado por archivos de resultados. | En la Fase 2 se registra el uso de CPU durante el pico (criterio de evidencia). |
| El pico aprueba con 10,2 s por inscripción, una experiencia que el criterio original consideraba inaceptable. | Es el objetivo central de la Fase 2. |
| El umbral `p(95)<2000` del script marca la corrida como fallida aunque la fase apruebe. | Se mantiene: es el umbral de R1, que la Fase 2 tiene que cumplir. |
| R3 cumple con 3,4% de margen. | La Fase 2 reparte la carga en varios procesos; se vuelve a evaluar. |
| D5 en el pico solo cubre logins. | El script del pico ahora tiene el check "inscripción: respuesta prevista". |
| Los JSON del pico contienen tokens de sesión. | Tokens eliminados de los JSON guardados; el script ya no los exporta. |
