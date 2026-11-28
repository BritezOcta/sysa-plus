# Fase 2 · Perfil de CPU del pico de inscripción

2026-11-28. Investigación posterior a `fase-2-veredicto-1.md` (R1 rechazado: p95 4,0 s contra 2 s).

## Corrección: las pruebas con 8 y 12 workers del veredicto 1 no eran válidas

`pnpm carga:pico` ejecutaba `docker compose run k6`, y k6 depende de `frontend`, que depende de `backend`.
Si el backend corría con una configuración distinta de la del archivo (más workers, perfilador), Compose lo
recreaba con la configuración por defecto antes de largar k6. Las corridas "con 8 workers" se hicieron en
realidad con 4, y las que fallaban en el setup con HTTP 502 eran el backend recreándose.

Arreglo: los comandos `carga:*` usan `docker compose run --no-deps`, y el setup del pico informa el HTTP
y el cuerpo cuando el login falla.

Medición repetida, verificando que el contenedor no se reinicie y la cantidad de workers:

| Workers | p95 inscripción | Host (máx.) |
|---|---|---|
| 4 | 3,65 s | 99% |
| 8 | 3,40 s | 100% |
| 12 | 3,76 s | 100% |

La conclusión se mantiene (más workers no ayudan), ahora con datos válidos.

## Perfil (V8 `--cpu-prof`, 4 workers, ventana de la ráfaga)

- Cada worker está ocupado el **86–88%** de su hilo durante los 4 s de la ráfaga.
- El código de la aplicación es despreciable. La CPU se va en el camino a SQL Server:

| Categoría | % de la CPU |
|---|---|
| Streams y sockets de Node (`writeBuffer`, `ondata`, eventos, buffers) | ~45% |
| Driver de SQL Server (`tedious`, `mssql`, `tarn`, `bl`) | ~16% |
| Prisma (`@prisma/client`, adaptador) | ~14% |
| Recolector de basura | ~4% |

## Consultas por pedido (contadas en `sys.dm_exec_query_stats`, un pedido aislado)

| Pedido | Consultas a SQL Server |
|---|---|
| Login | 10 |
| `GET /course-enrollments` | 31 |
| Inscripción rechazada (409) | 31 |
| Inscripción exitosa (201) | 54 |

Prisma con SQL Server resuelve cada relación incluida con una consulta aparte (no soporta
`relationLoadStrategy: "join"`), y hay consultas que buscan relaciones vacías (`... IN (NULL)`).
En el pico, 500 inscripciones son ~16.000 idas y vueltas, cada una con costo de CPU en el driver.

## Conclusión

El límite del pico es la **cantidad de consultas por inscripción** multiplicada por el costo de CPU del
driver por consulta, en una PC de 8 núcleos físicos compartidos con SQL Server y k6. Las palancas son
reducir consultas por pedido (traer solo lo necesario, cachear datos que casi no cambian, consolidar
lecturas) y medir en un servidor con k6 en otra máquina.
