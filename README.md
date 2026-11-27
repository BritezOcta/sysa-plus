# SysA+ · Sistema Académico UTN-FRGP

Monorepo con React + TypeScript (Vite), Express + Prisma y SQL Server. La gestión académica consulta datos reales y está restringida a administradores.

## Desarrollo

Requisitos: Node.js 22 o superior, pnpm 10 y SQL Server 2022. El contenedor del backend usa Node.js 22.

```bash
pnpm install
docker compose up -d sqlserver
```

Configurar `apps/backend/.env` con `DATABASE_URL`, `JWT_SECRET` y, opcionalmente, `PORT`. Usar los valores de la instalación; no versionar contraseñas.

```bash
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
pnpm dev:backend
pnpm dev:frontend
```

El frontend está en [localhost:5173](http://localhost:5173), la API en [localhost:3000/api/health](http://localhost:3000/api/health) y SQL Server en `localhost:1433`.

## Docker

```bash
docker compose up -d --build
docker compose logs -f backend
```

El backend ejecuta `prisma migrate deploy` antes de iniciar. Un error de migración detiene el arranque: no se ejecuta `db push --accept-data-loss` ni se ocultan errores. El arranque no crea cuentas de prueba ni carga o restablece la oferta académica.

## Migraciones y datos existentes

Se conservan los archivos originales de las cuatro migraciones locales `20261122000000_init` a `20261122000003_academic_management_fields`, incluidos sus nombres y contenido. No hay que volver a marcarlas como aplicadas si ya figuran en `_prisma_migrations`.

Las migraciones siguientes:

- Corrigen las diferencias entre el SQL histórico y el modelo de Prisma para instalaciones nuevas.
- Conservan las ediciones del plan y del período guardadas por la implementación anterior; el período anual se representa como `SEMESTER=0`.
- Incorporan ventanas de inscripción, horarios, cierre de evaluaciones y observaciones docentes de `develop`.
- Incorporan mesas de finales, sus ventanas de inscripción, criterios de regularización/promoción, recuperatorios y cierre de cursadas de los cambios nuevos de `develop`.

Las columnas redundantes de la implementación anterior permanecen como campos `legacy*` con `@ignore`: se conservan para recuperación, pero no se usan para responder la API. La carrera se deriva del plan; los alumnos se cuentan desde las inscripciones; la auditoría utiliza el usuario autenticado. Los eventos antiguos de seed sin usuario asociado no se presentan como acciones reales.

```bash
pnpm --filter backend db:migrate:status
pnpm --filter backend db:migrate
```

Antes de actualizar una base con datos, conservar un respaldo. La ruta soportada incluye la base que ya tiene las cuatro migraciones locales aplicadas. Si se creó con `db push` y no tiene historial, primero hay que comparar su estructura y establecer una línea base revisada; no marcar migraciones como aplicadas sin verificarla. Si aparecen tablas de un formato histórico incompatible con datos, la migración se detiene sin borrarlos e indica qué tabla requiere reconciliación.

## Primer administrador

En una instalación vacía, definir `ADMIN_DNI`, `ADMIN_EMAIL`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` y `ADMIN_PASSWORD` en el entorno del backend y ejecutar:

```bash
pnpm --filter backend db:bootstrap
```

La contraseña debe tener al menos 12 caracteres. Si ya existe un administrador, el comando preserva los usuarios y credenciales existentes. Las carreras, materias y correlatividades se cargan desde la aplicación.

## Datos de demostración de inscripción y docentes

Los escenarios de prueba de esos módulos se conservan en `prisma/seed-demo.ts`, separados de la aplicación y del arranque. Para una base de desarrollo descartable, pueden cargarse explícitamente con:

```bash
pnpm --filter backend db:seed:demo
```

Ese comando crea las cuentas de prueba originales (`11111111` / `Admin123!`, `22222222` / `Profesor123!`, `33333333` / `Alumno123!`) y escenarios del módulo de inscripción. No usarlo en una base de trabajo real.

## Contrato de gestión académica

- `GET /api/academic/snapshot`: carreras, materias, correlatividades e historial, sin escrituras implícitas.
- Altas y ediciones de materias reciben el payload plano y `requirements`. El identificador de una edición viene de la URL; si también se envía en el cuerpo, debe coincidir.
- Los cambios de estado reciben `{ "status": "active" }` o `{ "status": "inactive" }` y son idempotentes.
- El cliente no puede establecer cantidades de alumnos ni escribir eventos de auditoría.
- Cada mutación valida y guarda datos y auditoría en una misma transacción serializable. Los ciclos y los requisitos de otro plan se rechazan; una baja con dependencias conserva todos los registros.
- No hay endpoint de reset. «Recargar datos» consulta el estado persistido. Ante una respuesta de red perdida se consulta ese estado antes de repetir una operación.

El simulador curricular sigue siendo una herramienta hipotética sobre materias reales: comienza sin estados precargados y no altera inscripciones.

## Verificaciones

```bash
pnpm --filter backend typecheck
pnpm --filter backend test
pnpm --filter sysaplus build
pnpm --filter sysaplus lint
```

Las pruebas de integración requieren una base SQL Server vacía, migrada, cuyo nombre comience por `sysaplus_test_`. Configurar `TEST_DATABASE_URL` con esa base y ejecutar:

```bash
pnpm --filter backend test:integration
```

La suite rechaza nombres de base que no tengan ese prefijo y bases con usuarios existentes. Cubre permisos HTTP, duplicados, validación, ciclos, correlatividades entre planes, inscripciones reales, rollback ante fallos de auditoría o claves foráneas y ediciones simultáneas.
