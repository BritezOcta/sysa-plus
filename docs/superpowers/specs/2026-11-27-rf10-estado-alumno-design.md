# RF-10 · Gestionar el estado del alumno (activo / dado de baja)

## Intención

El Administrador/Director tiene que poder dar de baja o reactivar a un alumno (abandono, sanción, reincorporación) indicando el motivo. La baja impide iniciar sesión, inscribirse y generar certificados. Hoy ese bloqueo ya funciona a partir de `User.isActive`, pero ninguna pantalla ni endpoint permite cambiar ese valor.

## Objetivos

- Buscar al alumno por DNI y cambiar su estado con un motivo obligatorio.
- Al darlo de baja, cancelar:
  - las inscripciones a cursadas cuyo período todavía no empezó;
  - las inscripciones a finales con fecha futura.
- Registrar en la auditoría la fecha, el responsable, el motivo y lo que se canceló.
- Listar a los alumnos activos y a los dados de baja.

## No objetivos

- Cancelar cursadas en curso. Siguen en el historial y el docente las cierra como corresponda.
- Restaurar inscripciones al reactivar. El alumno se vuelve a inscribir si el período sigue abierto.
- Dar de baja profesores o administradores.
- Crear una tabla de historial de estados. El historial queda en `AUDIT_LOG`.
- Usar `StudentCareer.academicStatus`. No se toca.

## Enfoques considerados

- **A. Extender la pantalla de Usuarios** (elegido): un endpoint nuevo en `/api/admin/users` y una acción en `AdminUsersPage`. Reutiliza la búsqueda por DNI y la auditoría, y no requiere cambios en la base.
- **B. Pantalla propia con tabla `STUDENT_STATUS_CHANGE`:** se ve más prolija como trámite, pero suma una migración y una pantalla nueva, y duplica lo que ya guarda la auditoría.

## Diseño

### Backend

En `adminUsers.service.ts` / `adminUsers.routes.ts` se agrega el endpoint `PATCH /api/admin/users/:userId/status`.

- **Body:** `{ status: "active" | "inactive", reason: string }`.
- **Validaciones y errores:**

  | Caso | Respuesta |
  |---|---|
  | Motivo vacío o con más de 500 caracteres | `400` |
  | Usuario inexistente | `404 USER_NOT_FOUND` |
  | El usuario no tiene rol ALUMNO | `409 NOT_A_STUDENT` |
  | El alumno ya tiene ese estado | `409 NO_CHANGES` ("No hay cambios para aplicar") |
  | Quien llama no es administrador | Lo rechaza `requireRole`, que ya existe |

- **Transacción:**
  1. Actualiza `User.isActive`.
  2. Si es una baja, pasa a `CANCELADA`:
     - las `COURSE_ENROLLMENT` en estado `INSCRIPTO` cuyo `ACADEMIC_PERIOD.PERIOD_START_DATE` sea posterior a hoy;
     - las `EXAM_ENROLLMENT` en estado `INSCRIPTO` cuyo `EXAM_CALL.CALL_DATE` sea posterior a ahora.
  3. Si es una reactivación, también reinicia `failedLoginAttempts` y `lockedUntil`.
- **Auditoría:**
  - Nuevas acciones `STUDENT_DEACTIVATED` y `STUDENT_REACTIVATED`.
  - `details` registra el motivo y la cantidad de cursadas y finales cancelados.
  - Se escribe en la misma transacción. Una baja sin registro no se aplica.
- **Respuesta:** el nuevo estado y `{ cancelledCourses, cancelledExams }`.
- **Listado:** `search` acepta un filtro opcional `status=active|inactive`.

### Frontend

En `AdminUsersPage.tsx`:

- En las filas de alumnos se agrega el botón "Dar de baja" o "Reactivar".
- El botón abre un modal con el motivo obligatorio. Para la baja, el modal aclara que se cancelan las cursadas que todavía no empezaron y los finales futuros, y que las cursadas en curso se conservan.
- Al confirmar, un aviso informa cuántas inscripciones se cancelaron y la fila se actualiza.
- Se agrega el filtro "Estado" (Todos / Activos / Dados de baja).
- Los errores se muestran en la caja de error que ya tiene la página.

### Verificación

Tests de integración en `tests/` con la base `sysaplus_test_` (siguiendo el patrón de los tests existentes):

- La baja cancela las cursadas y los finales futuros, y deja intactas las cursadas en curso y las históricas.
- Aplicar el mismo estado devuelve `NO_CHANGES`.
- No se puede aplicar a un profesor.
- Hace falta motivo.
- Queda la auditoría.
- Un alumno dado de baja no puede iniciar sesión y vuelve a poder hacerlo al reactivarlo.

## Decisiones del implementador

- Textos exactos de los mensajes.
- Ubicación de la lógica en el repositorio, siguiendo los servicios existentes.
- Si el conteo de "se cancelarán N inscripciones" se muestra antes de confirmar o solo después. Por defecto, solo después, para no agregar otro endpoint.
