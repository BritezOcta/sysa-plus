# RF-10 · Estado del alumno: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** que el Administrador/Director pueda dar de baja o reactivar a un alumno desde la pantalla Usuarios, indicando un motivo. La baja cancela las cursadas que todavía no empezaron y los finales con fecha futura.

**Arquitectura:** un endpoint nuevo `PATCH /api/admin/users/:userId/status` en el router y el servicio de usuarios que ya existen. Usa una transacción de Prisma, que actualiza `USERS.IS_ACTIVE`, cancela las inscripciones y escribe `AUDIT_LOG`. En el frontend se agregan un modal con motivo y un filtro de estado en `AdminUsersPage`.

**Stack:** Express 5 + Prisma 7 (SQL Server), tests con `node:test` + `tsx`; React + Vite + CSS Modules.

**Spec:** `docs/superpowers/specs/2026-11-27-rf10-estado-alumno-design.md`

## Restricciones globales

- El estado del alumno es `User.isActive`. No se toca `StudentCareer.academicStatus`.
- No hay cambios de esquema ni migraciones.
- Solo aplica a usuarios con `role === "ALUMNO"`.
- El motivo es obligatorio, se recorta con trim y puede tener hasta 500 caracteres.
- **Estados que cancela la baja:** `COURSE_ENROLLMENT` en `INSCRIPTO` cuyo `academicPeriod.periodStartDate` sea posterior a hoy, y `EXAM_ENROLLMENT` en `INSCRIPTO` cuyo `examCall.callDate` sea posterior a ahora. Ambos pasan a `"CANCELADA"`.
- **No cancela:** cursadas en curso (período ya empezado) ni cursadas históricas (`REGULAR`, `APROBADA`, etc.).
- Reactivar no restaura inscripciones. Reinicia `failedLoginAttempts = 0` y `lockedUntil = null`.
- **Auditoría:** se escribe dentro de la misma transacción con `tx.auditLog.create`, no con `auditService.record`. Si falla, no se aplica el cambio.
- **Códigos de error:**

  | Código | Caso |
  |---|---|
  | `400 VALIDATION_ERROR` | Body inválido o motivo vacío |
  | `404 USER_NOT_FOUND` | Usuario inexistente |
  | `409 NOT_A_STUDENT` | El usuario no es alumno |
  | `409 NO_CHANGES` | El alumno ya tiene ese estado. Mensaje: "No hay cambios para aplicar" |

- Textos de la UI en español rioplatense, como el resto del sitio ("Dar de baja", "Reactivar").

## Foco de revisión

- **Cursada en curso al dar de baja:** queda en `INSCRIPTO`. El docente la sigue viendo. Ya la cubre un test (Task 2).
- **Final de hoy a una hora que ya pasó:** no se cancela, porque la comparación es `callDate > now`. Si la hora es posterior, sí se cancela. El test usa un final de ayer y uno de mañana (Task 2).
- **Dos administradores dan de baja al mismo alumno a la vez:** uno responde 200 y el otro `NO_CHANGES`. El estado se vuelve a leer dentro de la transacción y el `update` se hace con `where: { userId, isActive: actual }`. Si actualiza 0 filas, devuelve `NO_CHANGES` (test en Task 2).
- **Motivo con solo espacios o de más de 500 caracteres:** responde 400 y no cambia nada (test unitario en Task 1).
- **El administrador intenta darse de baja a sí mismo:** responde `NOT_A_STUDENT`, porque su rol no es ALUMNO. No requiere una regla aparte. El test de profesor cubre la ruta del rol (Task 2).

---

### Task 1: Validación del body

**Archivos:**
- Crear: `apps/backend/src/lib/studentStatus.ts`
- Test: `apps/backend/src/lib/studentStatus.test.ts`
- Modificar: `apps/backend/package.json` (agregar el test al script `"test"`)

**Interfaces:**
- Produce: `parseStudentStatusInput(body: unknown): { isActive: boolean; reason: string }`. Lanza `AppError(400, "VALIDATION_ERROR", …)`.
- Produce: `STUDENT_STATUS_REASON_MAX = 500`.

- [ ] **Step 1: Escribir el test que falla**

```ts
test("acepta active/inactive y recorta el motivo", () => {
  assert.deepEqual(parseStudentStatusInput({ status: "inactive", reason: "  Abandono  " }), { isActive: false, reason: "Abandono" });
  assert.deepEqual(parseStudentStatusInput({ status: "active", reason: "Reincorporación" }), { isActive: true, reason: "Reincorporación" });
});
test("rechaza estado inválido, motivo vacío o demasiado largo", () => {
  for (const body of [null, {}, { status: "baja", reason: "x" }, { status: "inactive" }, { status: "inactive", reason: "   " }, { status: "inactive", reason: "x".repeat(501) }]) {
    assert.throws(() => parseStudentStatusInput(body), (e: AppError) => e.statusCode === 400 && e.code === "VALIDATION_ERROR");
  }
  assert.doesNotThrow(() => parseStudentStatusInput({ status: "inactive", reason: "x".repeat(500) }));
});
```

Antes de escribir el test, revisar en `src/lib/AppError.ts` cómo se llaman las propiedades de status y código, y usar esos nombres.

- [ ] **Step 2:** `pnpm --filter backend exec tsx --test src/lib/studentStatus.test.ts`. Debe fallar porque el módulo no existe.
- [ ] **Step 3:** implementar `parseStudentStatusInput` en `src/lib/studentStatus.ts`.
- [ ] **Step 4:** volver a correr el test (tiene que pasar). Agregar `src/lib/studentStatus.test.ts` al script `"test"` y correr `pnpm --filter backend test`: deben pasar todos.
- [ ] **Step 5:** commit `feat(rf10): validación del cambio de estado del alumno`.

### Task 2: Endpoint, cancelaciones, auditoría y filtro de búsqueda

**Archivos:**
- Modificar: `apps/backend/src/services/audit.service.ts`. Agregar `STUDENT_DEACTIVATED` y `STUDENT_REACTIVATED` a `AUDIT_ACTIONS` con el comentario `// RF-10`.
- Modificar: `apps/backend/src/services/adminUsers.service.ts`. Agregar `setStudentStatus` y el parámetro de estado en `search`.
- Modificar: `apps/backend/src/routes/adminUsers.routes.ts`.
- Test: crear `apps/backend/tests/studentStatus.integration.test.ts` y agregarlo al script `"test:integration"`.

**Interfaces:**
- Consume: `parseStudentStatusInput` (Task 1), `ENROLLMENT_STATUS.CANCELADA` y `EXAM_STATUS.CANCELADA` de `src/types/academic.ts`.
- Produce: `adminUsersService.setStudentStatus(rawUserId: unknown, body: unknown, actor: { userId: number; ipAddress: string | null }): Promise<{ id: string; isActive: boolean; cancelledCourses: number; cancelledExams: number }>`.
- Produce: `adminUsersService.search(rawSearch: unknown, rawRole: unknown, rawStatus: unknown)`. `rawStatus` es `"active" | "inactive"`; cualquier otro valor se ignora.
- Produce: `PATCH /api/admin/users/:userId/status` con body `{ status, reason }`. Responde `200 { status: "OK", ...resultado }`. `GET /api/admin/users?status=…`.

- [ ] **Step 1: Escribir el test de integración**

Seguir el patrón de `tests/studentCourses.integration.test.ts`: guardia de `TEST_DATABASE_URL`, base vacía, `createApp().listen(0)` y cookie firmada con `signSessionToken(adminId, "ADMINISTRADOR", 600)`.

**Datos a crear:**
- Un administrador, un profesor y el alumno A.
- El alumno A tiene:
  - una cursada en un período actual (`day(-30)…day(30)`);
  - una cursada en un período futuro (`day(60)…`);
  - una cursada histórica en estado `REGULAR`;
  - un final ayer y un final mañana, ambos en `INSCRIPTO`.

**Subtests:**
1. **"la baja cancela solo lo futuro y audita el motivo":** `PATCH` con `{status:"inactive", reason:"Abandono"}`.
   - Responde 200, con `cancelledCourses === 1` y `cancelledExams === 1`.
   - La cursada actual sigue en `INSCRIPTO`, la futura pasa a `CANCELADA` y la histórica sigue en `REGULAR`.
   - El final de ayer sigue en `INSCRIPTO` y el de mañana pasa a `CANCELADA`.
   - Hay un `auditLog` con `action === "STUDENT_DEACTIVATED"`, `userId === adminId`, `entityId === String(alumnoId)`, y su `details` incluye `"Abandono"`.
2. **"el alumno dado de baja no puede iniciar sesión":** en la base se fija un `passwordHash` conocido para el alumno, con `bcrypt.hash`. El `POST /api/auth/login` responde 403 `ACCOUNT_INACTIVE`.
3. **"repetir el mismo estado responde NO_CHANGES":** responde 409 `NO_CHANGES` y no se crea otra fila de auditoría.
4. **"dos bajas simultáneas: una 200 y otra NO_CHANGES":** antes se reactiva al alumno y se lanzan dos `PATCH inactive` con `Promise.all`. Los status ordenados son `[200, 409]`.
5. **"reactivar devuelve el acceso y no restaura inscripciones":** antes se fija `lockedUntil` en el futuro.
   - `PATCH active` responde 200 y la cursada futura sigue en `CANCELADA`.
   - `lockedUntil` queda en `null`.
   - El login responde 200.
6. **"no aplica a profesores ni a usuarios inexistentes":** el profesor responde 409 `NOT_A_STUDENT`, el id 999999 responde 404 `USER_NOT_FOUND`, y con un motivo vacío responde 400.
7. **"el filtro de estado del listado":** `GET /api/admin/users?role=ALUMNO&status=inactive` incluye solo a los dados de baja.

- [ ] **Step 2:** correr `pnpm --filter backend test:integration` con `TEST_DATABASE_URL` apuntando a una base `sysaplus_test_*` migrada y vacía. Debe fallar con 404 en el `PATCH`. **Si no hay base de pruebas disponible, frenar y avisar a la persona.** No marcar el test como verificado.
- [ ] **Step 3: Implementar `setStudentStatus`**

Todo pasa dentro de `prisma.$transaction(async (tx) => …)`:

1. Parsear el id (usar el `parseUserId` existente) y el body.
2. Leer el usuario. Si no existe, `404`. Si no es alumno, `409 NOT_A_STUDENT`. Si ya tiene el estado pedido, `409 NO_CHANGES`.
3. Hacer `tx.user.updateMany({ where: { userId, isActive: !target }, data })`. Si `count === 0`, `NO_CHANGES`.
   - En una reactivación, `data` incluye `failedLoginAttempts: 0` y `lockedUntil: null`.
4. Si es una baja:
   - `tx.courseEnrollment.updateMany` con `studentCareer.studentProfile.userId`, `enrollmentStatus: "INSCRIPTO"` y `courseOffering.academicPeriod.periodStartDate > hoy`. Para "hoy", usar la fecha UTC a medianoche, igual que en las otras comparaciones de `@db.Date`.
   - `tx.examEnrollment.updateMany` con `studentCareer.studentProfile.userId`, `examStatus: "INSCRIPTO"` y `examCall.callDate > new Date()`.
5. `tx.auditLog.create`:
   - `entity: "USERS"` y `entityId: String(userId)`.
   - `details: "<Baja|Reactivación> de <Apellido, Nombre> (DNI …). Motivo: <motivo>. Canceladas: N cursada(s), M final(es)."` En la reactivación se omite la parte de canceladas.
   - `ipAddress` del actor.
6. Agregar a `search` el `where.isActive` según `rawStatus`.
7. Agregar la ruta en `adminUsers.routes.ts`, con el mismo estilo que `reset-password`.

- [ ] **Step 4:** correr `pnpm --filter backend test:integration` (todo en PASS) y `pnpm --filter backend typecheck` (sin errores).
- [ ] **Step 5:** commit `feat(rf10): endpoint para dar de baja y reactivar alumnos`.

### Task 3: Pantalla Usuarios

**Archivos:**
- Modificar: `apps/frontend/src/api/adminUsers.api.ts`.
- Crear: `apps/frontend/src/components/admin/StudentStatusModal.tsx`.
- Modificar: `apps/frontend/src/pages/AdminUsersPage.tsx`.

**Interfaces:**
- Consume: el endpoint y el filtro de la Task 2.
- Produce: `adminUsersApi.search(search: string, role: string, status: '' | 'active' | 'inactive')` y `adminUsersApi.setStatus(userId: string, status: 'active' | 'inactive', reason: string): Promise<{ id: string; isActive: boolean; cancelledCourses: number; cancelledExams: number }>`. El segundo usa `PATCH` con body JSON. Revisar en `httpClient.ts` cómo se envía un body.
- Produce: `StudentStatusModal({ user: AdminUserRow; onClose: () => void; onConfirm: (reason: string) => void; submitting: boolean })`.

- [ ] **Step 1: El modal**

Usar `ModalShell`, `FormField` y los estilos de `Modals.module.css`, como el modal de contraseña de la página. Tiene que mostrar:

- **Título:** "Dar de baja a <nombre>" o "Reactivar a <nombre>".
- **Texto de la baja:** "Se cancelarán sus inscripciones a cursadas que todavía no empezaron y a finales futuros. Las cursadas en curso se conservan. No podrá iniciar sesión."
- **Texto de la reactivación:** "Podrá volver a iniciar sesión e inscribirse. Las inscripciones canceladas no se restauran."
- **Campo de motivo:** textarea obligatorio con `maxLength={500}`. El botón de confirmar queda deshabilitado mientras el motivo (con trim) esté vacío o mientras `submitting` sea true.
- **Tono del botón:** de peligro para la baja y primario para la reactivación.

- [ ] **Step 2: La página**

- Estado `statusFilter` (`'' | 'active' | 'inactive'`) con un `<select>` "Estado" (Todos / Activos / Dados de baja) junto al de Rol. Se pasa a `search` y a las dependencias del `useEffect`.
- En las filas con `u.role === 'ALUMNO'`, agregar un botón "Dar de baja" o "Reactivar" antes de "Restablecer contraseña". Abre el modal (`changingStatus: AdminUserRow | null`).
- Al confirmar se llama a `setStatus`.
  - Si funciona, se muestra un toast `'success'`. En una baja, el toast dice "Se cancelaron N cursada(s) y M final(es)." Después se cierra el modal y se hace `setReloadKey((k) => k + 1)`.
  - Si falla, se muestra un toast `'danger'` con el mismo tratamiento de `NetworkError` que tiene `handleReset`.
- Actualizar el subtítulo de la página para mencionar la baja y la reactivación de alumnos.

- [ ] **Step 3:** `pnpm --filter sysaplus build` y `pnpm --filter sysaplus lint`, ambos sin errores.
- [ ] **Step 4: Verificación manual con la app levantada (skill `run`)**
  - Entrar como administrador (`11111111`), filtrar Alumnos y dar de baja a la alumna demo con un motivo.
  - Debe aparecer el toast con los conteos y la fila tiene que mostrar "Dado de baja".
  - El filtro "Dados de baja" la tiene que listar.
  - Reactivarla.
  - Probar el login como alumna (`33333333`) en los dos estados.
- [ ] **Step 5:** commit `feat(rf10): dar de baja y reactivar alumnos desde Usuarios`.
