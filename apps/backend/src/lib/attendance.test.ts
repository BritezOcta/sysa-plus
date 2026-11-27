import assert from "node:assert/strict";
import { test } from "node:test";
import {
  attendancePercent,
  attendanceSummary,
  attendanceWeight,
  attendedWeight,
  VALID_ATTENDANCE_STATUSES,
} from "./attendance.js";

test("peso de cada estado: tardanza vale media asistencia", () => {
  assert.equal(attendanceWeight("PRESENTE"), 1);
  assert.equal(attendanceWeight("JUSTIFICADO"), 1);
  assert.equal(attendanceWeight("TARDANZA"), 0.5);
  assert.equal(attendanceWeight("AUSENTE"), 0);
});

test("sin registro o estado desconocido no suma asistencia", () => {
  assert.equal(attendanceWeight(null), 0);
  assert.equal(attendanceWeight(undefined), 0);
  assert.equal(attendanceWeight("presente"), 0);
  assert.equal(attendanceWeight("OTRO"), 0);
});

test("asistencia ponderada", () => {
  assert.equal(attendedWeight(["PRESENTE", "TARDANZA", "AUSENTE", null, "JUSTIFICADO"]), 2.5);
});

test("porcentaje sobre todas las clases, redondeado; sin clases = 100", () => {
  assert.equal(attendancePercent(0, 0), 100);
  assert.equal(attendancePercent(3.5, 5), 70);
  assert.equal(attendancePercent(0.5, 1), 50);
  assert.equal(attendancePercent(2, 3), 67);
});

test("resumen por clase: la clase sin registro cuenta como falta", () => {
  assert.deepEqual(attendanceSummary(["PRESENTE", "PRESENTE", "PRESENTE", "TARDANZA", null]), {
    totalClasses: 5,
    presentCount: 3,
    justifiedCount: 0,
    lateCount: 1,
    absentCount: 0,
    unrecordedCount: 1,
    attendancePercentage: 70,
  });
});

test("resumen sin clases", () => {
  const s = attendanceSummary([]);
  assert.equal(s.totalClasses, 0);
  assert.equal(s.attendancePercentage, 100);
});

test("estados que el docente puede cargar", () => {
  for (const s of ["PRESENTE", "AUSENTE", "JUSTIFICADO", "TARDANZA"]) assert.ok(VALID_ATTENDANCE_STATUSES.has(s), s);
  assert.equal(VALID_ATTENDANCE_STATUSES.has("SIN_REGISTRO"), false);
});
