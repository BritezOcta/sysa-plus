# Pruebas de carga (k6)

Miden cuántos usuarios simultáneos soporta SysA+ antes de ponerse lento o empezar a fallar.
Corren con Docker: no hace falta instalar k6.

## Pasos

1. Levantar el sistema: `docker compose up -d --build`
2. Cargar los datos de prueba (500 alumnos, DNI `70000001` en adelante, clave `Carga123!`):

   ```
   pnpm carga:seed
   ```

   Para otra cantidad: `docker exec -e CARGA_ALUMNOS=1000 -e CARGA_CUPO_PICO=80 sysaplus-backend pnpm db:seed:carga`.
   Necesita un período con la inscripción abierta y uno terminado (los crea `db:seed:demo`).

3. Correr un escenario:

   | Comando | Qué hace | Dura |
   |---|---|---|
   | `pnpm carga:normal` | Alumnos navegando (inicio, estado académico, asistencias, cursado, inscripción, exámenes) en escalones de 10, 50, 100 y 200 usuarios simultáneos. | ~11 min |
   | `pnpm carga:pico` | 300 alumnos se inscriben a la misma comisión (cupo 50) en el mismo instante. **Volver a correr `pnpm carga:seed` antes de cada repetición.** | ~1 min |

   Opciones: `pnpm carga:normal -e MAX_USUARIOS=400`, `pnpm carga:pico -e USUARIOS=500 -e CUPO=80`.
   Si el seed se corrió con otra cantidad de alumnos, agregar `-e ALUMNOS=<cantidad>`.

## Cómo leer el resultado

Al final k6 muestra un resumen. Lo importante:

- **`http_req_duration` p(95)**: el 95% de las respuestas tardó menos que eso. Objetivo: menos de 1 s.
- **`http_req_failed`**: porcentaje de requests con error. Objetivo: menos del 1%.
- Los umbrales que no se cumplen aparecen marcados con ✗ y k6 termina con error.
- En `carga:normal`, la cantidad de usuarios que soporta es el último escalón que cumple los objetivos.
  Para ver en qué escalón se degradó, mirar la evolución en el resumen o correr con un `MAX_USUARIOS` menor.
- En `carga:pico`:
  - `inscripciones_ok` tiene que ser igual al cupo (nunca más).
  - `avisos_intente_nuevamente`: cuántas veces un alumno vio "Muchos alumnos se están inscribiendo… Intentá nuevamente".
  - `avisos_sistema_saturado`: cuántas veces la base no dio abasto ("El sistema está con mucha demanda…", HTTP 503).
    Si aparece, subir `DB_POOL_MAX` o `DB_TX_MAX_WAIT_MS` en el backend.
  - `abandonos_tras_reintentos` y `errores_inesperados` tienen que ser 0.
  - `llegadas_tarde`: alumnos que terminaron de iniciar sesión después de la largada común (por defecto,
    30 s después del setup; se cambia con `-e ESPERA_S=60`). Si no es 0, el pico fue menos simultáneo de lo previsto.

