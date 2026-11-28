# Veredicto Fase 2 (intento 2): RECHAZADO

Emitido por el agente `juez-carga` el 2026-11-28, sobre `loadtest/criterios/fase-2.md` (sin cambios).

Los números de los archivos cumplen todos los criterios. Se rechaza porque **la corrida evaluada no es
válida como evidencia**:

| # | Criterio | Valor medido | Línea base (Fase 1) | Cumple |
|---|---|---|---|---|
| V1 | `llegadas_tarde` == 0 | 0 | — | ✅ |
| V2 | `vus_max` == 500 | 500 | 500 | ✅ |
| V3 | `fase-2-cpu.txt` de la corrida del pico | Es de la 1.ª de tres corridas, no de la evaluada (3.ª) | — | ❌ |
| D1–D6 | Duros | Todos cumplen | — | ✅ |
| R1 | Pico p(95) < 2000 ms | 1733.90 ms en el archivo (3.ª corrida); la 1.ª dio 2,05 s | 10175.92 ms | ✅ en el archivo |
| R2 | avisos / 500 < 5% | 0% | 0% | ✅ |
| R3 | Login p(95) < 3000 ms | 2355.34 ms | 2896.89 ms (−19%) | ✅ |
| R4 | Uso normal 200 p(95) <= 80.3 ms | 26.06 ms | 66.91 ms (−61%) | ✅ |
| R5 | Uso normal 200 errores == 0 | 0 (de 21.304) | 0 | ✅ |
| R6 | Uso normal 500 p(95) < 1000 ms | 38.37 ms | 3894.37 ms (−99%) | ✅ |

## Fundamento

- **V3:** el registro de CPU corresponde a otra corrida que la evaluada.
- **Mejor de tres:** el pico se corrió tres veces con el mismo código (2,05 s, 1,81 s y 1,73 s) y se
  conservó solo la última. La 1.ª era válida y no cumplía R1. Los criterios solo permiten repetir una
  corrida cuando falla un criterio de validez, no uno de rendimiento.

Para aprobar: una corrida de pico válida con su `pico-inscripcion.json` y su `fase-2-cpu.txt`, sobre
código commiteado, informando todas las corridas válidas que se hagan.

## Observaciones del juez y su tratamiento

| Observación | Tratamiento |
|---|---|
| El margen de R1 es chico y varía (1,73–2,05 s). Evaluar con varias corridas requiere decidirlo antes de medir y registrarlo. | Decisión del equipo, pendiente. |
| Las corridas se hicieron sobre código sin commit. | Código commiteado antes de la próxima medición. |
| La CPU se muestrea cada ~2 s y la ráfaga dura menos que eso. | A mejorar en la próxima medición. |
| D5 dice "los tres" pero son cuatro archivos. | Redacción a corregir en la próxima fase. |
