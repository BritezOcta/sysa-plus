# Cursado / Notas de parciales / Encuestas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el placeholder de `/alumno/cursado` por una pantalla con cursadas, notas de evaluaciones y encuesta docente anónima.

**Architecture:** Endpoint nuevo `/api/student/courses` siguiendo el patrón route → controller → service → repository de `studentAttendance`. La lógica pura (armado del DTO, validación de la encuesta) vive en `src/lib/studentCourses.ts` y se testea con `node:test`. La encuesta se guarda en dos tablas separadas (quién respondió / qué respondió) para que sea anónima.

**Tech Stack:** Express 5, Prisma 7 (SQL Server), tsx --test; React + Vite + CSS modules.

**Spec:** `docs/superpowers/specs/2026-11-27-cursado-notas-encuestas-design.md`

## Global Constraints

- Encuesta: exactamente 5 respuestas, enteros 1–5; comentario opcional, ≤ 1000 caracteres (trim; vacío → null).
- Una encuesta por inscripción; segundo envío → 409 `SURVEY_ALREADY_ANSWERED`.
- Solo inscripciones no canceladas del propio alumno; solo cursadas en curso (`periodEndDate >= hoy`, misma regla que `isInProgress` en `academicStatus.service.ts`).
- `SURVEY_RESPONSE` no tiene referencia al alumno ni timestamp. Nada de `AuditLog` para la encuesta.
- Notas visibles apenas se cargan, con `isClosed` para marcarlas como definitivas.
- Preguntas (textos exactos, en orden):
  1. "El docente explica los temas con claridad"
  2. "Las clases están bien organizadas"
  3. "El docente está disponible para responder consultas"
  4. "Las evaluaciones se corresponden con los contenidos dados"
  5. "Valoración general de la cursada"
- Textos de UI y errores en español rioplatense, como el resto del sistema.

## Review Focus

- Alumno que manda `enrollmentId` de otro alumno → 404 (no revelar que existe); test en Task 2.
- Doble click en "Enviar" / dos pestañas → la unique de `SURVEY_SUBMISSION` corta la segunda; P2002 se traduce a 409; test en Task 2 (`mapSurveyError`).
- Respuestas `"5"` (string), `5.5`, `0`, `6`, `null`, array de 4 o 6 → 400 `INVALID_SURVEY`; test en Task 1.
- Cursada sin evaluaciones cargadas → la tarjeta muestra "Todavía no hay evaluaciones cargadas", no una tabla vacía; Task 4.
- Recuperatorio sin nota → "Pendiente", y el nombre del parcial que recupera; DTO en Task 1 (`recoversName`).

---

### Task 1: Lógica pura (DTO + validación)

**Files:**
- Create: `apps/backend/src/lib/studentCourses.ts`
- Create: `apps/backend/src/lib/studentCourses.test.ts`
- Modify: `apps/backend/package.json` (agregar el test al script `test`)

**Interfaces — Produces:**
```ts
export const SURVEY_QUESTIONS: readonly string[]; // los 5 textos de Global Constraints
export type SurveyState = "AVAILABLE" | "ANSWERED" | "NOT_AVAILABLE";
export interface StudentAssessmentDto { id: string; name: string; type: string; date: string | null;
  maxScore: number; score: number | null; isClosed: boolean; recoversName: string | null }
export interface StudentCourseDto { enrollmentId: string; subjectCode: string; subjectName: string;
  commission: string; period: string; inProgress: boolean; condition: string; gradesClosed: boolean;
  assessments: StudentAssessmentDto[]; survey: SurveyState }
export function isCourseInProgress(periodEndDate: Date, today: Date): boolean;
export function conditionLabel(enrollmentStatus: string, inProgress: boolean): string;
  // inProgress → "CURSANDO"; INSCRIPTO fuera de período → "SIN CERRAR"; si no, el status tal cual
export function surveyState(inProgress: boolean, answered: boolean): SurveyState;
  // answered → ANSWERED; !inProgress → NOT_AVAILABLE; si no AVAILABLE
export function parseSurveyPayload(body: unknown): { answers: number[]; comment: string | null };
  // lanza AppError(400, "INVALID_SURVEY", ...)
```
`period` con el mismo formato que asistencias: `` `${year} - ${semester}° Cuat.` `` (semester 0 → `` `${year} - Anual` ``).

- [ ] **Step 1: Tests que fallan** en `studentCourses.test.ts` (estilo de `courseCondition.test.ts`):
  - `parseSurveyPayload({answers:[1,2,3,4,5]})` → `{answers:[1,2,3,4,5], comment:null}`
  - `parseSurveyPayload({answers:[5,5,5,5,5], comment:"  bien  "}).comment === "bien"`; `comment:"   "` → null
  - lanza `INVALID_SURVEY` para: `[1,2,3,4]`, `[1,2,3,4,5,5]`, `[0,1,1,1,1]`, `[6,1,1,1,1]`, `[1.5,1,1,1,1]`, `["5",1,1,1,1]`, `null`, `{}`, comentario de 1001 caracteres
  - `conditionLabel("INSCRIPTO", true) === "CURSANDO"`, `("INSCRIPTO", false) === "SIN CERRAR"`, `("REGULAR", false) === "REGULAR"`
  - `surveyState(true,false)==="AVAILABLE"`, `(false,false)==="NOT_AVAILABLE"`, `(false,true)==="ANSWERED"`
  - `isCourseInProgress` con `periodEndDate` igual a hoy → true; ayer → false
- [ ] **Step 2:** `pnpm --filter backend exec tsx --test src/lib/studentCourses.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar. Agregar `src/lib/studentCourses.test.ts` al script `test`.
- [ ] **Step 4:** `pnpm --filter backend test` → PASS.
- [ ] **Step 5:** Commit `feat: lógica de cursadas y validación de encuesta del alumno`.

### Task 2: Migración, repositorio, servicio y rutas

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20261127000000_course_surveys/migration.sql`
- Regenerate: `apps/backend/generated/prisma/**` (`pnpm --filter backend db:generate`)
- Create: `apps/backend/src/repositories/studentCourses.repository.ts`, `src/services/studentCourses.service.ts`, `src/controllers/studentCourses.controller.ts`, `src/routes/studentCourses.routes.ts`
- Modify: `apps/backend/src/routes/index.ts` → `apiRouter.use("/student/courses", studentCoursesRouter)`
- Modify: `apps/backend/src/lib/studentCourses.ts` + test (agregar `mapSurveyError`)

**Interfaces — Consumes:** Task 1. **Produces:**
- `GET /api/student/courses` → `{ status: "OK", questions: string[], courses: StudentCourseDto[] }`
- `POST /api/student/courses/:enrollmentId/survey` body `{ answers, comment? }` → `201 { status: "OK" }`
- Errores: 400 `INVALID_SURVEY`; 404 `ENROLLMENT_NOT_FOUND` (no existe, ajena o cancelada); 409 `SURVEY_NOT_AVAILABLE` (período terminado); 409 `SURVEY_ALREADY_ANSWERED`.

Schema (convención de mapeo del archivo):
```prisma
model SurveySubmission {
  surveySubmissionId Int @id(map: "PK_SURVEY_SUBMISSION") @default(autoincrement()) @map("SURVEY_SUBMISSION_ID")
  courseEnrollmentId Int @unique(map: "UQ_SURVEY_SUBMISSION_ENROLLMENT") @map("COURSE_ENROLLMENT_ID")
  submittedAt DateTime @default(now(), map: "DF_SURVEY_SUBMISSION_AT") @map("SUBMITTED_AT")
  courseEnrollment CourseEnrollment @relation(fields: [courseEnrollmentId], references: [courseEnrollmentId], onUpdate: NoAction, map: "FK_SS_ENROLLMENT")
  @@map("SURVEY_SUBMISSION")
}
/// Respuesta anónima: sin referencia al alumno ni fecha, a propósito.
model SurveyResponse {
  surveyResponseId Int @id(map: "PK_SURVEY_RESPONSE") @default(autoincrement()) @map("SURVEY_RESPONSE_ID")
  courseOfferingId Int @map("COURSE_OFFERING_ID")
  q1 Int @map("Q1") @db.TinyInt   // ... q2..q5 igual
  comment String? @map("COMMENT") @db.NVarChar(1000)
  courseOffering CourseOffering @relation(fields: [courseOfferingId], references: [courseOfferingId], onUpdate: NoAction, map: "FK_SR_OFFERING")
  @@index([courseOfferingId], map: "IX_SR_OFFERING")
  @@map("SURVEY_RESPONSE")
}
```
Más las relaciones inversas `surveySubmission SurveySubmission?` en `CourseEnrollment` y `surveyResponses SurveyResponse[]` en `CourseOffering`. Agregar `CHECK (Qn BETWEEN 1 AND 5)` en el SQL.

- [ ] **Step 1: Test que falla** en `studentCourses.test.ts`: `mapSurveyError(err)` con `{ code: "P2002" }` devuelve un `AppError` 409 `SURVEY_ALREADY_ANSWERED`; con cualquier otro error lo devuelve tal cual.
- [ ] **Step 2:** Correr → FAIL. Implementar `mapSurveyError(err: unknown): unknown`. Correr → PASS.
- [ ] **Step 3:** Schema + SQL de migración. Generar el SQL con `pnpm --filter backend exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` (o escribirlo a mano con el formato `BEGIN TRY / BEGIN TRAN` de las migraciones existentes), agregar los CHECK. `pnpm --filter backend db:validate` → OK; `db:generate`.
- [ ] **Step 4:** Repositorio: `findStudentProfileByUserId(userId)`, `findCoursesWithGrades(studentId)` (inscripciones `!= CANCELADA` con período, materia, evaluaciones ordenadas por fecha/id con `recoversAssessment.assessmentName`, las `assessmentGrades` filtradas por esa inscripción y `surveySubmission`; orden como asistencias), `findEnrollmentForSurvey(enrollmentId, studentId)`, `createSurvey({ courseEnrollmentId, courseOfferingId, answers, comment })` en `prisma.$transaction` (submission + response).
- [ ] **Step 5:** Servicio `getMyCourses(user)` y `submitSurvey(user, enrollmentId, body)`. Perfil ausente → 403 `FORBIDDEN` (igual que asistencias). `enrollmentId` no numérico → 404. Usar `mapSurveyError` en el `catch` de `createSurvey`. Controller + rutas con `requireAuth, requireRole("ALUMNO")`.
- [ ] **Step 6:** `pnpm --filter backend typecheck` y `test` → PASS. Si hay base local: `db:migrate`, levantar backend, login como `33333333` y probar GET, POST válido (201), POST repetido (409), POST con `[0,1,1,1,1]` (400).
- [ ] **Step 7:** Commit `feat: endpoint de cursadas del alumno y encuestas anónimas`.

### Task 3: Cliente API del frontend

**Files:** Create `apps/frontend/src/api/studentCourses.api.ts`

**Produces:** tipos `StudentAssessment`, `StudentCourse`, `SurveyState` (espejo de los DTO de Task 1) y
```ts
export const studentCoursesApi = {
  getMyCourses(): Promise<{ questions: string[]; courses: StudentCourse[] }>,
  submitSurvey(enrollmentId: string, answers: number[], comment: string | null): Promise<void>,
};
```
usando `apiRequest` de `httpClient` (revisar su firma para POST con body).

- [ ] **Step 1:** Implementar. `pnpm --filter sysaplus build` → compila. (Se commitea junto con Task 4.)

### Task 4: Página CursadoPage + encuesta

**Files:**
- Create: `apps/frontend/src/features/student/pages/CursadoPage.tsx`, `CursadoPage.module.css`
- Create: `apps/frontend/src/features/student/components/SurveyModal.tsx` (o dentro de `pages/` si no existe carpeta `components`; seguir lo que haya)
- Modify: `apps/frontend/src/features/student/StudentArea.tsx` — sacar `"cursado"` de `PLACEHOLDERS` y agregar `<Route path="cursado" element={<CursadoPage />} />` con comentario de RF.

**Comportamiento:**
- Header con `getNavItem("cursado")` (label/description), estilo `common.page`/`pageHeader`.
- Estados: cargando, error (`ErrorBanner` o el patrón de las otras páginas de alumno) y vacío ("No tenés cursadas registradas").
- Sección "En curso" (`inProgress`) con una tarjeta (`common.card`) por cursada: materia, comisión y período; chip de condición (mapear `CURSANDO`/`REGULAR`/`APROBADA`/`LIBRE`/`DESAPROBADA` a `StatusChip`; `SIN CERRAR` → chip muted con ese texto). Tabla de evaluaciones: nombre (+ "Recupera: X"), fecha (`formatFecha`, "—" si null), nota `score / maxScore` con coma decimal (`toLocaleString("es-AR")`) o "Pendiente", y la marca "Definitiva" o "Provisoria" según `isClosed`. Sin evaluaciones → "Todavía no hay evaluaciones cargadas".
- Pie de tarjeta: `AVAILABLE` → botón "Responder encuesta docente"; `ANSWERED` → "Encuesta respondida ✓"; `NOT_AVAILABLE` no muestra nada.
- Sección "Cursadas anteriores": `<details>` por cursada, con un `<summary>` que muestra materia, período y chip; adentro, la misma tabla.
- `SurveyModal` (`ModalShell`): las 5 preguntas de `questions`, cada una con un radiogroup 1–5 (`<fieldset>` + `<legend>`); textarea con `maxLength={1000}` y contador; "Enviar" deshabilitado hasta completar las 5. Mientras envía, deshabilitado (evita doble click). Si sale bien, cierra y marca la cursada como `ANSWERED` en el estado local. Si da error, se muestra el mensaje dentro del modal (un 409 `SURVEY_ALREADY_ANSWERED` también la marca `ANSWERED`). Aclarar en el subtítulo: "Tus respuestas son anónimas."

- [ ] **Step 1:** Implementar la página, el modal y la ruta.
- [ ] **Step 2:** `pnpm --filter sysaplus build` y `pnpm --filter sysaplus lint` → sin errores.
- [ ] **Step 3:** Probar en el navegador con el seed demo (`33333333` / `Alumno123!`): ver notas, responder la encuesta y recargar (debe seguir "respondida").
- [ ] **Step 4:** Commit `feat: pantalla de cursado, notas de parciales y encuestas del alumno`.
