# Asistencias del alumno + Tardanza Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un solo cálculo de asistencia (Tardanza = ½, sin registro = falta) en todo el sistema, Tardanza cargable por el docente, y la página `/alumno/asistencias` rehecha con resumen + detalle.

**Architecture:** `src/lib/attendance.ts` concentra pesos y fórmula; los 6 cálculos actuales la llaman. El endpoint `GET /api/student/attendance` amplía su `summary`. El front del alumno pasa a `features/student/pages/AsistenciasPage.tsx` con los estilos del área.

**Tech Stack:** Express 5 + Prisma 7 (SQL Server), tsx --test; React + Vite + CSS modules.

**Spec:** `docs/superpowers/specs/2026-11-27-asistencias-alumno-design.md`

## Global Constraints

- Pesos: `PRESENTE 1`, `JUSTIFICADO 1`, `TARDANZA 0.5`, `AUSENTE 0`; estado desconocido o sin registro = 0.
- % = `Math.round(asistido / totalClases * 100)`; denominador = todas las clases de la comisión; 0 clases → 100.
- Mínimo `MIN_ATTENDANCE_PERCENT` (75) de `src/types/academic.ts`; `atRisk = totalClasses > 0 && % < 75`.
- Estados válidos al tomar lista: `PRESENTE`, `AUSENTE`, `JUSTIFICADO`, `TARDANZA`.
- Textos en español rioplatense. Respetar finales de línea de cada archivo existente (varios son CRLF): editar con la herramienta Edit, no con perl/sed multilínea.

## Review Focus

- Comisión sin clases → el alumno ve "Todavía no hay clases registradas", no "100%"; Task 4.
- Alumno inscripto después de empezar la cursada → sus clases previas cuentan como "Sin registro"/falta (regla del cierre, decidida); test en Task 1 (`unrecordedCount`).
- Promedio de reportes con comisión sin alumnos activos o sin clases → 100, sin división por cero; test en Task 1 (`attendancePercent(0, 0)`), y Task 2 usa `activos * clases`.
- Docente re-toma lista de una clase ya cargada con Tardanza → la proyección no la cuenta dos veces (se excluye la clase actual, como hoy); Task 3.
- Datos viejos con estados en minúscula u otro string → peso 0, sin romper; test en Task 1.

---

### Task 1: `lib/attendance.ts` (fórmula única)

**Files:** Create `apps/backend/src/lib/attendance.ts`, `apps/backend/src/lib/attendance.test.ts`; modify `apps/backend/package.json` (script `test`), `apps/backend/src/lib/courseCondition.test.ts`.

**Produces:**
```ts
export const ATTENDANCE_STATUS = { PRESENTE: "PRESENTE", AUSENTE: "AUSENTE", JUSTIFICADO: "JUSTIFICADO", TARDANZA: "TARDANZA" } as const;
export const VALID_ATTENDANCE_STATUSES: ReadonlySet<string>;
export function attendanceWeight(status: string | null | undefined): number;
export function attendedWeight(statuses: readonly (string | null | undefined)[]): number;
export function attendancePercent(attended: number, totalClasses: number): number;
export interface AttendanceSummary { totalClasses: number; presentCount: number; justifiedCount: number;
  lateCount: number; absentCount: number; unrecordedCount: number; attendancePercentage: number }
export function attendanceSummary(statusPerClass: readonly (string | null)[]): AttendanceSummary;
  // un elemento por clase de la comisión; null = sin registro
```

- [ ] **Step 1: Tests que fallan** (`attendance.test.ts`):
  - `attendanceWeight("PRESENTE")===1`, `("JUSTIFICADO")===1`, `("TARDANZA")===0.5`, `("AUSENTE")===0`, `(null)===0`, `("presente")===0`, `("OTRO")===0`
  - `attendancePercent(0, 0) === 100`; `attendancePercent(3.5, 5) === 70`; `attendancePercent(0.5, 1) === 50`; `attendancePercent(2, 3) === 67`
  - `attendanceSummary(["PRESENTE","PRESENTE","PRESENTE","TARDANZA",null])` → `{ totalClasses:5, presentCount:3, justifiedCount:0, lateCount:1, absentCount:0, unrecordedCount:1, attendancePercentage:70 }`
  - `attendanceSummary([])` → `totalClasses 0`, `attendancePercentage 100`
  - `VALID_ATTENDANCE_STATUSES.has("TARDANZA")` y no `"SIN_REGISTRO"`
  - en `courseCondition.test.ts`, con `parciales: [parcial(9), parcial(9)]`:
    - `["PRESENTE","TARDANZA","TARDANZA","TARDANZA"]` de 4 (2,5/4 → 63%) → `"LIBRE"`
    - `["PRESENTE","PRESENTE","TARDANZA","TARDANZA"]` de 4 (3/4 → 75% exacto, no es libre) → `"APROBADA"`
- [ ] **Step 2:** `pnpm --filter backend exec tsx --test src/lib/attendance.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar; sumar el test al script `test`.
- [ ] **Step 4:** `pnpm --filter backend test` → PASS.
- [ ] **Step 5:** Commit `feat: fórmula única de asistencia con tardanza como media asistencia`.

### Task 2: Backend usa la fórmula única

**Files:** Modify `src/services/teacher.service.ts`, `src/services/studentAttendance.service.ts`, `src/services/adminStudents.service.ts`, `src/repositories/adminStudents.repository.ts`, `src/services/adminReports.service.ts`, `src/repositories/adminReports.repository.ts`.

**Consumes:** Task 1. **Produces** (`GET /api/student/attendance`, cada curso):
```ts
{ enrollmentId, subjectCode, subjectName, commission, period, enrollmentStatus,
  inProgress: boolean,                      // isCourseInProgress de lib/studentCourses.ts
  summary: AttendanceSummary & { minPercentage: number; atRisk: boolean },
  sessions: { sessionId, date, topic, status }[] }  // status: estado o "SIN_REGISTRO"; orden fecha desc (como hoy)
```

- [ ] **Step 1:** `teacher.service.ts`: `VALID_STATUSES` → `VALID_ATTENDANCE_STATUSES`; `attendancePercentOf` → `attendancePercent(attendedWeight(statuses), totalSessions)`; lista de comisión (≈L167-175) igual; `previousAttendedClasses` = `attendedWeight(previousAttendances)` (puede ser .5). Borrar `attendancePercentOf` si queda sin uso.
- [ ] **Step 2:** `studentAttendance.service.ts`: armar `statusPerClass` desde `classSessions` y usar `attendanceSummary`; agregar `inProgress`, `minPercentage`, `atRisk`.
- [ ] **Step 3:** Admin: agregar `_count: { select: { classSessions: true } }` al offering en ambos repositorios. `adminStudents`: % por alumno = `attendancePercent(attendedWeight(statuses), clases)`. `adminReports`: `promedioAsistencia = attendancePercent(Σ attendedWeight de activos, activos * clases)`.
- [ ] **Step 4:** `pnpm --filter backend typecheck` y `test` → PASS. `grep -rn '"TARDANZA"\|=== "PRESENTE"' src/services` → solo queda `lib/attendance.ts` como fuente (ninguna comparación suelta en servicios).
- [ ] **Step 5:** Commit `refactor: todos los cálculos de asistencia usan la fórmula única`.

### Task 3: Docente puede cargar Tardanza

**Files:** Modify `apps/frontend/src/types/teacherAttendance.types.ts`, `apps/frontend/src/api/teacher.api.ts`, `apps/frontend/src/pages/TeacherAttendancePage.tsx`; create `apps/frontend/src/constants/attendance.constants.ts` (exportar desde `constants/index.ts` si ese índice reexporta todo).

**Produces:** `ATTENDANCE_WEIGHT: Record<"PRESENTE"|"AUSENTE"|"JUSTIFICADO"|"TARDANZA", number>` en el front.

- [ ] **Step 1:** Tipo `AttendanceStatus` suma `"TARDANZA"` (types + `teacher.api.ts` L50, L75; quitar el tipo local duplicado de la página si coincide). Botones de estado: agregar "Tardanza" al array de L320. `getProjectedStats`: `attended = previousAttendedClasses + (status ? ATTENDANCE_WEIGHT[status] : 0)`.
- [ ] **Step 2:** `pnpm --filter sysaplus build` → OK; lint sin errores nuevos (baseline: 3 preexistentes).
- [ ] **Step 3:** Probar contra base temporal: tomar lista con una Tardanza → `POST` 200, el % del alumno baja medio punto proporcional.
- [ ] **Step 4:** Commit `feat: el docente puede registrar tardanzas al tomar asistencia`.

### Task 4: Página de asistencias del alumno + seed

**Files:**
- Create `apps/frontend/src/features/student/pages/AsistenciasPage.tsx`, `AsistenciasPage.module.css`
- Modify `apps/frontend/src/api/studentAttendance.api.ts` (tipos del contrato de Task 2), `apps/frontend/src/features/student/StudentArea.tsx` (ruta `asistencias` → `AsistenciasPage`)
- Delete `apps/frontend/src/pages/studentAttendancePage.tsx`
- Modify `apps/backend/prisma/seed-demo.ts` (función `seedCurrentAttendance`)

**Comportamiento:**
- Header con `getNavItem("asistencias")`. Estados cargando / error con "Reintentar" (patrón de `CursadoPage`) / vacío.
- "En curso": grilla de tarjetas (`button` con `aria-pressed`) por cursada `inProgress`: materia + comisión, `%` grande, barra con marca vertical en `minPercentage`, "X de Y clases" (X = asistido ponderado con coma: `toLocaleString("es-AR")`), aviso "Riesgo de quedar libre" (chip danger) si `atRisk`. `totalClasses === 0` → "Todavía no hay clases registradas", sin %. Seleccionada por defecto: la primera en curso.
- Detalle de la seleccionada: tabla Fecha (`formatFecha(date, true)`), Tema ("—"), Estado chip: Presente ok · Justificado info · Tardanza warn ("Tardanza (½)") · Ausente danger · Sin registro muted. Debajo, totales por estado.
- "Cursadas anteriores": `<details>` por cursada (como Cursado) con % en el summary y la misma tabla adentro.
- Seed `seedCurrentAttendance()` (después de `seedCurrentCourses` en `main`): si la comisión Física I 1K1 del cuatrimestre en curso de Lucía no tiene clases, crear 10 clases semanales desde `periodStartDate` (solo las ≤ hoy) en Física I con estados de Lucía en orden `P,P,T,P,J,P,P,P,null,P` → 8,5 de 10 = 85%; en Análisis de Sistemas 2K1, 8 clases `P,A,A,P,A,P,A,null` → = 3 de 8 = 38%, en riesgo. Temas cortos de ejemplo. Guard idempotente propio.

- [ ] **Step 1:** Implementar página, tipos, ruta; borrar la página vieja.
- [ ] **Step 2:** `pnpm --filter sysaplus build` y lint (sin errores nuevos).
- [ ] **Step 3:** Seed: correrlo dos veces sobre una base `sysaplus_test_*` nueva (segunda corrida omite) y verificar `GET /api/student/attendance` de Lucía: Física I `attendancePercentage` 85, `lateCount` 1, `unrecordedCount` 1; Análisis de Sistemas `atRisk: true`.
- [ ] **Step 4:** Commit `feat: página de asistencias del alumno con resumen y detalle` (seed en commit aparte `chore(seed): ...`).
