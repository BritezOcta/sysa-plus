# Fase 2 · medición oficial (intento 3)

- Commit medido: `45f9ed7` (rama `feat/seguridad-rf12-ajustes`, con `develop` mergeado). Ese commit solo
  agrega el cambio de criterios sobre `06e014c`; el código desplegado es el mismo.
- Backend: `WEB_CONCURRENCY=4`. El contenedor se inició a las 2026-11-28T03:15:55Z y tenía la misma hora
  de inicio al terminar: **no hubo reinicios** durante la medición.
- Inicio: 2026-11-28 00:17:14 · Fin: 2026-11-28 00:43:48 (hora local).
- Corridas en este orden, cada pico precedido por `pnpm carga:seed`. **Ninguna se descartó ni se repitió.**

| Corrida | Archivos | p95 | Otros |
|---|---|---|---|
| Pico 1 | `pico-inscripcion-1.json`, `fase-2-cpu-1.txt` | 2090.14 ms | ok 50, errores 0, abandonos 0, tarde 0, avisos 0, vus 500 |
| Pico 2 | `pico-inscripcion-2.json`, `fase-2-cpu-2.txt` | 1823.92 ms | ok 50, errores 0, abandonos 0, tarde 0, avisos 0, vus 500 |
| Pico 3 | `pico-inscripcion-3.json`, `fase-2-cpu-3.txt` | 1852.02 ms | ok 50, errores 0, abandonos 0, tarde 0, avisos 0, vus 500 |
| Login 500 | `login-masivo.json` | 2893 ms | 0 errores |
| Uso normal 200 | `uso-normal.json` | 25.92 ms | 0 errores |
| Uso normal 500 | `uso-normal-500.json` | 38.10 ms | 0 errores |

El script de medición no llegó a escribir esta tabla (un error de sintaxis de PowerShell). Se reconstruyó
con los mismos archivos JSON que generó cada corrida; los valores salen de ahí.
