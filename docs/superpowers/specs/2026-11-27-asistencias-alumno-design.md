# Asistencias del alumno — Diseño

## Intención
Rehacer `/alumno/asistencias` con el diseño del área del alumno y que el porcentaje que ve el alumno sea
**el mismo** con el que se cierra la cursada (RF-07). Hoy puede ver 100% y quedar LIBRE al cierre.

## Decisiones del usuario
- **Cálculo único = el del cierre**: (PRESENTE + JUSTIFICADO + ½ × TARDANZA) / todas las clases de la comisión.
  Clase sin registro del alumno = cuenta como falta y se muestra "Sin registro". Mínimo 75% (`MIN_ATTENDANCE_PERCENT`).
- **Tardanza = media asistencia, completa**: el docente puede cargarla al tomar lista y vale ½ en todo el sistema:
  alumno, cierre de cursada (RF-07), pantallas del docente, admin de alumnos y reportes.
- **Layout resumen + detalle**: tarjetas de las cursadas en curso con %, barra con marca del 75% y aviso de riesgo;
  al elegir una se ve el detalle clase por clase. Cursadas anteriores abajo, plegadas (como Cursado).

## Enfoques considerados
1. **Función compartida en `src/lib/attendance.ts` (elegido)**: `attendanceSummary()` la usan el cierre del docente
   (`teacher.service.ts`) y el endpoint del alumno. Un solo lugar para la regla.
2. Copiar la fórmula en el servicio del alumno: vuelve a divergir con el próximo cambio.
3. Cambiar la regla del cierre: descartado por el usuario.

## Backend
- `src/lib/attendance.ts`:
  - `ATTENDANCE_WEIGHT = { PRESENTE: 1, JUSTIFICADO: 1, TARDANZA: 0.5, AUSENTE: 0 }`; estado desconocido = 0.
  - `attendedWeight(statuses)` → suma de pesos (puede tener .5).
  - `attendancePercent(attended, totalClasses)` → `Math.round(attended / total * 100)`; 0 clases → 100 (como hoy).
  - `attendanceSummary(statuses: (string | null)[] por clase)` →
    `{ totalClasses, presentCount, justifiedCount, lateCount, absentCount, unrecordedCount, attendancePercentage }`.
- Todos los cálculos pasan a usarla (sin registro = falta, denominador = todas las clases de la comisión):
  - `teacher.service.ts`: cierre (`attendancePercentOf`), lista de alumnos de la comisión y `previousAttendedClasses`
    de la toma de lista. `VALID_STATUSES` suma `TARDANZA`.
  - `adminStudents.service.ts` (por alumno) y `adminReports.service.ts` (promedio de la comisión =
    Σ asistencia ponderada / (alumnos activos × clases)). Hoy dividen por registros cargados: cambia el número
    que ve el admin cuando hay clases sin registro. Necesitan la cantidad de clases de la comisión en la query.
- `GET /api/student/attendance` (mismo endpoint): `summary` con los campos de arriba + `minPercentage` (75) y
  `atRisk` (`totalClasses > 0 && % < 75`); por cursada `inProgress` (misma regla que Cursado: `periodEnd >= hoy`).

## Frontend
- Docente (`TeacherAttendancePage.tsx`, tipos y `teacher.api.ts`): cuarta opción "Tardanza" al tomar lista;
  la proyección de % usa el mismo peso ½ (constante compartida en el front).
- `features/student/pages/AsistenciasPage.tsx` + `.module.css` reemplaza `pages/studentAttendancePage.tsx`
  (se borra; solo la usa esta ruta). Estados con chips: Presente (ok), Justificado (info), Tardanza (warn),
  Ausente (danger), Sin registro (muted). Fechas con `formatFecha(…, true)`. Sin link "Volver al inicio" (el layout ya tiene menú).
- Tarjeta: % grande, barra con marca en 75, "X de Y clases", aviso "Riesgo de quedar libre" si `atRisk`.
  Con 0 clases: "Todavía no hay clases registradas" en vez de 100%.
- Detalle de la cursada seleccionada debajo de las tarjetas (por defecto la primera en curso).

## Seed (mi call)
- Agregar clases y asistencias a las cursadas en curso de Lucía (Física I 85% con una tardanza, una justificada y una clase sin registro; Análisis de Sistemas en riesgo),
  en una función propia con guard (solo si esas comisiones no tienen clases), para que se vea sobre una base ya sembrada.

## Verificación
- Tests unitarios de `attendance.ts`: sin registro = falta, justificado cuenta 1, tardanza ½, 0 clases → 100,
  redondeo (ej. 1 tardanza + 0 presentes de 1 clase = 50%; 3 presentes + 1 tardanza de 5 = 70%).
- Test de `computeCourseCondition` con tardanzas que dejan al alumno debajo de 75 → LIBRE.
- typecheck, tests backend, build y lint del front; prueba en Docker con el seed.
