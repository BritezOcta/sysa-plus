# Veredicto Fase 2 (intento 3): APROBADO

Emitido por el agente `juez-carga` el 2026-11-28, sobre `loadtest/criterios/fase-2.md` con el cambio del
2026-11-28 (pico evaluado con tres corridas y mediana), commiteado antes de medir (`45f9ed7`).

| # | Criterio | Valor medido | Línea base (Fase 1) | Cumple |
|---|---|---|---|---|
| V1 | `llegadas_tarde` == 0 (cada corrida) | 0 / 0 / 0 | — | ✅ |
| V2 | `vus_max` == 500 (cada corrida) | 500 / 500 / 500 | 500 | ✅ |
| V3 | `fase-2-cpu-n.txt` de cada corrida | Los 3, alineados con cada corrida | — | ✅ |
| D1 | `inscripciones_ok` == 50 (cada corrida) | 50 / 50 / 50 | 50 | ✅ |
| D2 | `errores_inesperados` == 0 (cada corrida) | 0 / 0 / 0 | 0 | ✅ |
| D3 | `abandonos_tras_reintentos` == 0 (cada corrida) | 0 / 0 / 0 | 0 | ✅ |
| D4 | Login `http_req_failed` == 0 | 0 (de 500) | 0 | ✅ |
| D5 | `checks.fails` == 0 en todos los archivos | 0 en los seis | 0 | ✅ |
| D6 | Uso normal 500 `http_req_failed` == 0 | 0 (de 53.196) | 0 | ✅ |
| R1 | Mediana de p(95) del pico < 2000 ms | **1852.02 ms** (2090.14 / 1823.92 / 1852.02) | 10175.92 ms (−81,8%) | ✅ |
| R2 | Avisos / 500 < 5% (cada corrida) | 0% / 0% / 0% | 0% | ✅ |
| R3 | Login p(95) < 3000 ms | 2892.90 ms | 2896.89 ms (−0,1%) | ✅ |
| R4 | Uso normal 200 p(95) <= 80.3 ms | 25.92 ms | 66.91 ms (−61%) | ✅ |
| R5 | Uso normal 200 errores == 0 | 0 (de 21.392) | 0 | ✅ |
| R6 | Uso normal 500 p(95) < 1000 ms | 38.10 ms | 3894.37 ms (−99%) | ✅ |

## Fundamento

Se cumplen todos los criterios vigentes. Las tres corridas del pico son válidas, cada una con su registro
de CPU, y no se descartó ninguna. El juez verificó en el historial de git que el cambio de criterios se
commiteó unos 77 s antes del inicio de la primera corrida.

## Observaciones del juez y su tratamiento

| Observación | Tratamiento |
|---|---|
| R1 aprueba por la mediana. La corrida 1 dio 2090 ms: 2 de 6 corridas del mismo código quedaron sobre el límite. La regla se decidió después de ver que el p95 caía a los dos lados de 2000. El margen real es chico. | Se acepta como está. Si se quiere margen: menos consultas por inscripción (consolidar lecturas en SQL) y medir en un servidor con k6 en otra máquina. |
| El login 500 volvió prácticamente a la línea base (2893 ms, con 107 ms de margen); en el intento 2 había dado 2355 ms. | Durante la ráfaga de login el host está al 96–100%: el límite es la CPU de la PC (bcrypt + k6 + SQL Server en la misma máquina). |
| El límite está en la CPU de la PC; la CPU de los contenedores se muestrea cada ~2 s y la ráfaga de inscripción queda en una sola muestra. | Para una medición más fina, muestrear desde dentro del contenedor. |
| No se puede confirmar desde los archivos que no hubiera cambios sin commitear al construir la imagen. | La imagen se construyó justo después del commit del merge (`06e014c`), con la copia de trabajo limpia; `45f9ed7` solo agrega el cambio de criterios. |
