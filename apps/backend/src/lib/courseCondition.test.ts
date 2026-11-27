import assert from "node:assert/strict";
import { test } from "node:test";
import { computeCourseCondition, type ParcialResult } from "./courseCondition.js";

const parcial = (score: number | null, recoveryScore: number | null = null, hasRecovery = false): ParcialResult => ({
  maxScore: 10,
  score,
  recoveryMaxScore: hasRecovery || recoveryScore !== null ? 10 : null,
  recoveryScore,
});

const base = { attendancePercent: 90, regularGrade: 6, promotionGrade: 8 };

test("todos los parciales >= promoción → APROBADA", () => {
  assert.equal(computeCourseCondition({ ...base, parciales: [parcial(9), parcial(8)] }), "APROBADA");
});

test("todos >= regularización pero alguno < promoción → REGULAR", () => {
  assert.equal(computeCourseCondition({ ...base, parciales: [parcial(7), parcial(9)] }), "REGULAR");
});

test("el recuperatorio reemplaza al parcial desaprobado", () => {
  assert.equal(computeCourseCondition({ ...base, parciales: [parcial(7), parcial(4, 6)] }), "REGULAR");
});

test("recuperatorio desaprobado → DESAPROBADA", () => {
  assert.equal(computeCourseCondition({ ...base, parciales: [parcial(5), parcial(3, 4)] }), "DESAPROBADA");
});

test("parcial sin nota cargada cuenta como desaprobado", () => {
  assert.equal(computeCourseCondition({ ...base, parciales: [parcial(9), parcial(null)] }), "DESAPROBADA");
});

test("recuperatorio existente pero no rendido: vale la nota del parcial", () => {
  assert.equal(computeCourseCondition({ ...base, parciales: [parcial(9), parcial(8, null, true)] }), "APROBADA");
});

test("asistencia bajo el mínimo → LIBRE aunque las notas den promoción", () => {
  assert.equal(computeCourseCondition({ ...base, attendancePercent: 60, parciales: [parcial(8), parcial(9)] }), "LIBRE");
});

test("materia sin promoción → REGULAR aunque las notas sean altas", () => {
  assert.equal(
    computeCourseCondition({ ...base, promotionGrade: null, parciales: [parcial(10), parcial(10)] }),
    "REGULAR",
  );
});

test("las notas se normalizan a escala 0-10 según la nota máxima", () => {
  const p: ParcialResult = { maxScore: 100, score: 80, recoveryMaxScore: null, recoveryScore: null };
  assert.equal(computeCourseCondition({ ...base, parciales: [p] }), "APROBADA");
});
