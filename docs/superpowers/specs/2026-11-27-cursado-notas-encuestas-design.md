# Cursado / Notas de parciales / Encuestas — Diseño

## Intención
Reemplazar el placeholder de `/alumno/cursado` por una pantalla real donde el alumno ve sus cursadas,
las notas de sus parciales/recuperatorios/TPs y responde una encuesta docente por cursada.

## Decisiones del usuario
- **Encuestas reales y simples**: encuesta fija (5 preguntas 1–5 + comentario opcional), una por cursada,
  una sola vez, anónima. Sin pantalla de resultados para docente/admin por ahora (no-goal).
- **Notas visibles apenas se cargan**, marcando si la evaluación está cerrada (definitiva) o abierta.
- **Cursadas actuales + historial**: las en curso arriba; las anteriores abajo, plegadas, con condición final.

## Enfoques considerados
1. **Endpoint de alumno nuevo + 2 tablas de encuesta (elegido)**: sigue el patrón de
   `studentAttendance` (route → controller → service → repository). Encuesta en tablas propias.
2. Reusar `academic-status`: ese endpoint ya es pesado y resuelve otra cosa; mezclarlo acopla RF distintos.
3. Encuesta sin backend: descartado por el usuario.

## Backend
- `GET /api/student/courses` (rol ALUMNO): cursadas no canceladas del alumno, ordenadas por período desc.
  Por cursada: materia, comisión, período, `inProgress` (hoy dentro de `periodStart..periodEnd`),
  condición (`enrollmentStatus`; `INSCRIPTO` en período terminado → "SIN CERRAR"), si la cursada está cerrada
  (`gradesClosedAt`), evaluaciones (nombre, tipo, fecha, nota máx., nota del alumno o null, `isClosed`,
  a qué parcial recupera) y estado de encuesta (`available` / `answered` / `notAvailable`).
- `POST /api/student/courses/:enrollmentId/survey` con `{ answers: number[5], comment?: string }`.
  Valida: la inscripción es del alumno, no está cancelada, el período está en curso, respuestas enteras 1–5,
  comentario ≤ 1000 caracteres, no respondida antes (409 si ya respondió).
- **Anonimato** — migración nueva con dos tablas:
  - `SURVEY_SUBMISSION(COURSE_ENROLLMENT_ID unique, SUBMITTED_AT)`: solo registra *que* respondió.
  - `SURVEY_RESPONSE(COURSE_OFFERING_ID, Q1..Q5 tinyint, COMMENT nvarchar(1000) null)`: sin referencia al alumno
    ni timestamp, así no se puede cruzar con la submission. Ambas se insertan en una transacción.
- Preguntas definidas como constante en el backend y devueltas en el GET (el front no las hardcodea).

## Frontend
- `features/student/pages/CursadoPage.tsx` + `.module.css`, reutilizando `common.module.css` y `StatusChip`.
- `api/studentCourses.api.ts`; ruta `cursado` deja de ser placeholder en `StudentArea.tsx`.
- Layout:
  ```
  Cursado / Notas de parciales / Encuestas
  ── En curso ───────────────────────────────
  [Análisis Matemático I · Com 1K1 · 2026-2°]   CURSANDO
     1er Parcial   12/09  8,00 / 10   ✓ definitiva
     Recup. 1er P. —      Pendiente
     TP Integrador 30/10  7,50 / 10   abierta
     [ Responder encuesta docente ]   (o "Encuesta respondida ✓")
  ── Cursadas anteriores (plegadas) ─────────
  ▸ Física I · 2026-1°   REGULAR
  ```
- Encuesta en un modal (`ModalShell`) con 5 escalas 1–5 y textarea; al enviar, la tarjeta pasa a "respondida".

## Calls del builder (a revisar)
- Encuesta disponible solo en cursadas del período en curso (no en historial).
- Preguntas: claridad del docente; organización de las clases; disponibilidad para consultas;
  correspondencia evaluaciones/contenidos; valoración general.
- Sin auditoría (`AuditLog`) para la encuesta, para no dejar rastro que rompa el anonimato.

## Verificación
- Tests unitarios del service (validación de respuestas, doble envío, inscripción ajena).
- `pnpm --filter backend typecheck`, `test`; `pnpm --filter sysaplus build`, `lint`.
