import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "./AppError.js";
import { conditionLabel, isCourseInProgress, isSurveyOpen, mapSurveyError, parseSurveyPayload, surveyState } from "./studentCourses.js";

const isInvalidSurvey = (err: unknown) => err instanceof AppError && err.statusCode === 400 && err.code === "INVALID_SURVEY";

test("encuesta válida sin comentario", () => {
  assert.deepEqual(parseSurveyPayload({ answers: [1, 2, 3, 4, 5] }), { answers: [1, 2, 3, 4, 5], comment: null });
});

test("el comentario se recorta y vacío queda null", () => {
  assert.equal(parseSurveyPayload({ answers: [5, 5, 5, 5, 5], comment: "  bien  " }).comment, "bien");
  assert.equal(parseSurveyPayload({ answers: [5, 5, 5, 5, 5], comment: "   " }).comment, null);
});

test("rechaza respuestas inválidas", () => {
  const invalid: unknown[] = [
    { answers: [1, 2, 3, 4] },
    { answers: [1, 2, 3, 4, 5, 5] },
    { answers: [0, 1, 1, 1, 1] },
    { answers: [6, 1, 1, 1, 1] },
    { answers: [1.5, 1, 1, 1, 1] },
    { answers: ["5", 1, 1, 1, 1] },
    { answers: [1, 1, 1, 1, 1], comment: 5 },
    { answers: [1, 1, 1, 1, 1], comment: "x".repeat(1001) },
    null,
    {},
  ];
  for (const body of invalid) {
    assert.throws(() => parseSurveyPayload(body), isInvalidSurvey, JSON.stringify(body));
  }
});

test("comentario de 1000 caracteres es válido", () => {
  assert.equal(parseSurveyPayload({ answers: [1, 1, 1, 1, 1], comment: "x".repeat(1000) }).comment?.length, 1000);
});

test("etiqueta de condición", () => {
  assert.equal(conditionLabel("INSCRIPTO", true), "CURSANDO");
  assert.equal(conditionLabel("INSCRIPTO", false), "SIN CERRAR");
  assert.equal(conditionLabel("REGULAR", false), "REGULAR");
});

test("estado de la encuesta", () => {
  assert.equal(surveyState(true, false), "AVAILABLE");
  assert.equal(surveyState(false, false), "NOT_AVAILABLE");
  assert.equal(surveyState(false, true), "ANSWERED");
  assert.equal(surveyState(true, true), "ANSWERED");
});

test("cursada en curso hasta el último día del período", () => {
  const today = new Date("2026-11-27T00:00:00Z");
  assert.equal(isCourseInProgress(new Date("2026-11-27T00:00:00Z"), today), true);
  assert.equal(isCourseInProgress(new Date("2026-11-26T00:00:00Z"), today), false);
});

test("una restricción única violada (P2002) se traduce a encuesta ya respondida", () => {
  const mapped = mapSurveyError(Object.assign(new Error("unique"), { code: "P2002" }));
  assert.ok(mapped instanceof AppError);
  assert.equal(mapped.statusCode, 409);
  assert.equal(mapped.code, "SURVEY_ALREADY_ANSWERED");
});

test("otros errores se devuelven sin cambios", () => {
  const original = new Error("boom");
  assert.equal(mapSurveyError(original), original);
});

test("la encuesta solo se abre entre el inicio y el fin del período", () => {
  const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
  const today = d("2026-11-27");
  assert.equal(isSurveyOpen(d("2026-08-01"), d("2026-12-05"), today), true);
  assert.equal(isSurveyOpen(d("2026-11-27"), d("2026-11-27"), today), true);
  assert.equal(isSurveyOpen(d("2027-03-15"), d("2027-07-10"), today), false); // todavía no empezó
  assert.equal(isSurveyOpen(d("2026-03-01"), d("2026-07-10"), today), false); // ya terminó
});
