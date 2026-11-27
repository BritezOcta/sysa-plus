# Pantallas de correlatividades del alumno (cursar / rendir)

## Intención

Reemplazar las dos páginas "en construcción" del menú del alumno (`/alumno/correlatividad-cursar` y `/alumno/correlatividad-rendir`) por el **cuadro completo de correlatividades del plan**. Para cada materia se muestran todas sus correlativas, y en cada una si el alumno ya la cumple (✓) o no (✗).

La tabla de Estado académico ya muestra solo lo que falta. Estas pantallas sirven para consultar el reglamento completo, cruzado con la situación del alumno.

## Objetivos

- **Correlatividad para cursar:** por materia, las correlativas de tipo `regularizada_cursar` y `aprobada_cursar`, con la condición exigida (Regular / Aprobada) y ✓/✗.
- **Correlatividad para rendir:** por materia, las correlativas de tipo `aprobada_rendir`, con ✓/✗.
- Las materias sin correlativas aparecen con "Sin correlativas".
- **Columna "Situación"** por materia:
  - **Para cursar:** "Habilitada" si `canEnroll`; "Te falta(n) N" si puede cursarse pero tiene correlativas sin cumplir. Si ya está aprobada, regular o en curso, se muestra su estado con el `StatusChip` existente.
  - **Para rendir:** "Habilitada" si `canTakeExam`; "Te falta(n) N" si está regular pero le faltan correlativas. En otros casos, su estado.
- Filtros por año y búsqueda por nombre o código, como en Plan de materias.
- Un alumno sin plan o con datos de correlatividades inconsistentes ve el mismo manejo de error que Estado académico (`AcademicStatusFallback`).

## No objetivos

- Editar correlatividades: eso es del administrador (RF-02).
- Endpoints nuevos.
- Cambiar qué cuenta como "cumplida". Se usa exactamente la regla actual de `academicStatus.service.ts`.

## Enfoques considerados

- **A. Ampliar `GET /api/academic-status` (elegido):** cada materia suma `requirementsToEnroll` y `requirementsForExam` con `met`. Reutiliza la carga actual, y el ✓/✗ sale de la misma lógica que `canEnroll`/`canTakeExam`, así que no pueden contradecirse.
- **B. Endpoint propio `/academic-status/correlativities`:** deja intacta la respuesta actual, pero duplica la carga y la regla de cumplimiento.
- **Descartado: calcularlo solo en el frontend.** La API actual solo devuelve los requisitos faltantes, así que no alcanza para saber cuáles se cumplen.

## Diseño

### Backend

- **Tipo nuevo:** `RequirementDto` = `MissingRequirementDto` + `met: boolean`.
- **Campos nuevos en `SubjectStatusDto`:** `requirementsToEnroll: RequirementDto[]` y `requirementsForExam: RequirementDto[]`, siempre completos e independientes del estado de la materia.
- **Lógica:** la evaluación de cada correlativa se extrae a una función pura en `src/lib/`, con test unitario. `missingToEnroll` y `missingForExam` pasan a derivarse de esa función (`!met`), así ambas salidas quedan atadas a la misma regla.
- **Lo que no cambia:** los campos existentes y su comportamiento, incluidas las reglas de cuándo se vacían los `missing*`.

### Frontend

- `types/academicStatus.types.ts` se actualiza con los campos nuevos.
- Un componente de cuadro con prop `mode: 'cursar' | 'rendir'`, usado por dos páginas registradas en `StudentArea.tsx`. Esas dos rutas salen de `PLACEHOLDERS`.
- Se usan los estilos de `features/student/common.module.css` (tabla, chips, filtros) para que se vea igual al resto del área del alumno.

### Verificación

- Test unitario de la función de evaluación con estos casos:
  - regular sobre una correlativa regular → ✓;
  - aprobada sobre una correlativa regular → ✓;
  - regular sobre una correlativa aprobada → ✗;
  - correlativa inactiva o desconocida → ✗;
  - separación entre los requisitos para cursar y para rendir.
- `pnpm --filter backend test`, `typecheck` y `pnpm --filter sysaplus build`.
- Revisión manual con la alumna demo (`33333333`).

## Decisiones del implementador

- Textos exactos y orden de las columnas.
- Agrupar las filas por año, con encabezados por año, como en Plan de materias.
