# Pantallas de correlatividades del alumno: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** reemplazar los placeholders `/alumno/correlatividad-cursar` y `/alumno/correlatividad-rendir` por el cuadro completo de correlatividades del plan, con ✓/✗ por requisito.

**Arquitectura:** `GET /api/academic-status` suma `requirementsToEnroll` y `requirementsForExam` por materia, calculados por una función pura que también alimenta los `missing*` existentes. En el frontend, un componente `CorrelativitiesTable` con `mode` se usa en dos páginas.

**Stack:** Express + Prisma, `node:test` con `tsx`; React + CSS Modules (`features/student/common.module.css`).

**Spec:** `docs/superpowers/specs/2026-11-27-correlatividades-alumno-design.md`

## Restricciones globales

- **Tipos de correlatividad:** `regularizada_cursar` y `aprobada_cursar` aplican para cursar; `aprobada_rendir` aplica para rendir (`CORRELATIVITY_TYPE` en `src/types/academic.ts`). Un tipo desconocido se ignora.
- **Regla de cumplimiento (sin cambios):**
  - Una correlativa APROBADA se cumple solo con el estado `APROBADA`.
  - Una correlativa REGULAR se cumple con `REGULAR` o `APROBADA`.
  - Una correlativa fuera del plan activo (estado desconocido) no se cumple.
- **Compatibilidad:** los campos existentes de `SubjectStatusDto` (`canEnroll`, `canTakeExam`, `missingToEnroll`, `missingForExam`) no cambian de valor para ningún alumno.
- **Textos:** se usan "Regular" o "Aprobada" para la condición exigida y "Sin correlativas" para las materias que no tienen. En Situación: "Habilitada", "Te falta 1" / "Te faltan N", o el `StatusChip` de la materia.

## Foco de revisión

- **Materia en curso o ya aprobada con correlativas sin cumplir** (posible con datos cargados a mano): en "cursar" se muestra su estado, no "Te falta N", pero los ✗ igual se ven en la columna Requisitos (Task 2, regla de Situación).
- **Correlativa sobre una materia inactiva del plan:** se muestra ✗. Ya la cubre el test `"correlativa desconocida o inactiva no se cumple"` (Task 1).
- **Materias con `year: null`:** se agrupan en "Sin año asignado", como en Plan de materias (Task 2).
- **Plan sin ninguna correlatividad de rendir:** todas las filas muestran "Sin correlativas", sin una tabla vacía rara (Task 2).
- **Error o carga de la API:** se muestra `AcademicStatusFallback`, igual que Plan de materias (Task 2).

---

### Task 1: Requisitos completos en la API

**Archivos:**
- Crear: `apps/backend/src/lib/correlativityRequirements.ts`
- Test: crear `apps/backend/src/lib/correlativityRequirements.test.ts` y agregarlo al script `"test"` de `apps/backend/package.json`.
- Modificar: `apps/backend/src/types/academicStatus.ts`. Agregar `RequirementDto extends MissingRequirementDto { met: boolean }` y los campos `requirementsToEnroll: RequirementDto[]` y `requirementsForExam: RequirementDto[]` en `SubjectStatusDto`.
- Modificar: `apps/backend/src/services/academicStatus.service.ts`. El bucle `for (const req of sps.requirements)` se reemplaza por la función nueva, y `missing*` = requisitos con `!met`, con el mismo vaciado que hoy. Si `toMissing` queda sin uso, se borra.

**Interfaces:**
- Produce:

  ```ts
  evaluateRequirements(
    requirements: { correlativityType: string; requiredSubject: { studyPlanSubjectId: number; subject: { subjectCode: string; subjectName: string } } }[],
    statusOf: (studyPlanSubjectId: number) => SubjectStatus | undefined,
  ): { toEnroll: RequirementDto[]; forExam: RequirementDto[] }
  ```

  Se conserva el orden de entrada.
- Produce: `SubjectStatusDto.requirementsToEnroll` y `SubjectStatusDto.requirementsForExam`, para la Task 2.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
const req = (id: number, type: string) => ({ correlativityType: type, requiredSubject: { studyPlanSubjectId: id, subject: { subjectCode: `M${id}`, subjectName: `Materia ${id}` } } });
const statuses = new Map<number, SubjectStatus>([[1, "REGULAR"], [2, "APROBADA"], [3, "CURSANDO"]]);
const statusOf = (id: number) => statuses.get(id);

test("regular cumple regularizada_cursar; aprobada también", () => {
  const { toEnroll } = evaluateRequirements([req(1, "regularizada_cursar"), req(2, "regularizada_cursar")], statusOf);
  assert.deepEqual(toEnroll.map((r) => [r.studyPlanSubjectId, r.requiredCondition, r.met]), [[1, "REGULAR", true], [2, "REGULAR", true]]);
});
test("regular no cumple aprobada_cursar ni aprobada_rendir", () => {
  const r = evaluateRequirements([req(1, "aprobada_cursar"), req(1, "aprobada_rendir"), req(2, "aprobada_rendir")], statusOf);
  assert.deepEqual(r.toEnroll.map((x) => [x.requiredCondition, x.met]), [["APROBADA", false]]);
  assert.deepEqual(r.forExam.map((x) => [x.studyPlanSubjectId, x.met]), [[1, false], [2, true]]);
});
test("correlativa desconocida o inactiva no se cumple; cursando no cuenta como regular", () => {
  const { toEnroll } = evaluateRequirements([req(99, "regularizada_cursar"), req(3, "regularizada_cursar")], statusOf);
  assert.deepEqual(toEnroll.map((x) => x.met), [false, false]);
});
test("tipo de correlatividad desconocido se ignora", () => {
  const r = evaluateRequirements([req(1, "otro_tipo")], statusOf);
  assert.deepEqual([r.toEnroll.length, r.forExam.length], [0, 0]);
});
```

- [ ] **Step 2:** `pnpm --filter backend exec tsx --test src/lib/correlativityRequirements.test.ts`. Debe fallar porque el módulo no existe.
- [ ] **Step 3:** implementar `evaluateRequirements` y conectarla en el servicio, como se describe en Archivos.
- [ ] **Step 4:** correr `pnpm --filter backend test` (deben pasar todos, incluidos los nuevos) y `pnpm --filter backend typecheck` (sin errores).
- [ ] **Step 5:** commit `feat: requisitos completos de correlatividades en el estado académico`.

### Task 2: Pantallas "Correlatividad para cursar / rendir"

**Archivos:**
- Modificar: `apps/frontend/src/types/academicStatus.types.ts`. Agregar `StatusRequirement extends StatusMissingRequirement { met: boolean }`, y en `SubjectStatusRow` los campos `requirementsToEnroll: StatusRequirement[]` y `requirementsForExam: StatusRequirement[]`.
- Crear: `apps/frontend/src/features/student/pages/CorrelatividadesPage.tsx`, que exporta `CorrelatividadesPage({ mode }: { mode: 'cursar' | 'rendir' })`.
- Crear: `apps/frontend/src/features/student/pages/CorrelatividadesPage.module.css`, solo para la lista de requisitos y los íconos ✓/✗.
- Modificar: `apps/frontend/src/features/student/StudentArea.tsx`. Sacar `"correlatividad-cursar"` y `"correlatividad-rendir"` de `PLACEHOLDERS` y agregar sus `<Route>` con `mode`.

**Interfaces:**
- Consume: los campos de la Task 1 a través de `useAcademicStatus()`.

- [ ] **Step 1: La página**

Se arma como `PlanMateriasPage`:
- `useAcademicStatus` + `AcademicStatusFallback`.
- Encabezado con `getNavItem(id)` para el título y la descripción, donde `id = "correlatividad-" + mode`.
- Barra de búsqueda (código o nombre) y filtro de año.
- Una `section.card` por año (las materias con `null` van en "Sin año asignado").

**Tabla:** Código · Materia · Requisitos · Situación.
- **Requisitos:** `mode === 'cursar' ? requirementsToEnroll : requirementsForExam`. Cada ítem se muestra como `✓`/`✗` + nombre + "(Regular)" o "(Aprobada)". Cada uno tiene un `aria-label` ("cumplida" o "pendiente"), para que no dependa solo del color. Si la lista está vacía, se muestra "Sin correlativas" en `common.muted`.
- **Situación**, con faltantes = requisitos con `!met`:
  - **cursar:** si `canEnroll`, chip `chipOk` "Habilitada". Si no, y el estado es PENDIENTE, LIBRE o DESAPROBADA, chip `chipWarn` "Te falta 1" / "Te faltan N". En cualquier otro caso, `<StatusChip estado={status} />`.
  - **rendir:** si `canTakeExam`, "Habilitada". Si no, y el estado es REGULAR con faltantes, "Te falta(n) N". Si es REGULAR sin faltantes (regularidad vencida), `chipMuted` "Regularidad vencida". En cualquier otro caso, `StatusChip`.

- [ ] **Step 2:** registrar las rutas en `StudentArea.tsx`.
- [ ] **Step 3:** `pnpm --filter sysaplus build` sin errores. Correr `pnpm --filter sysaplus lint`: no debe aparecer ningún error nuevo además de los 3 que ya existen (StudentLayout, TeacherAttendancePage, TeacherGradesPage).
- [ ] **Step 4: Verificación manual**
  - Levantar backend y frontend de desarrollo contra `sysaplus_test_rf10` con `db:seed:demo`, en los puertos 3010 y 5180, como en RF-10.
  - Por HTTP, entrando como `33333333`, `GET /api/academic-status` tiene que devolver `requirementsToEnroll` y `requirementsForExam`, con al menos un `met: true` y un `met: false`.
- [ ] **Step 5:** commit `feat: pantallas de correlatividades para cursar y rendir`.
