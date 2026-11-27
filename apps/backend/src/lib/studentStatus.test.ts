import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "./AppError.js";
import { parseStudentStatusInput } from "./studentStatus.js";

test("acepta active/inactive y recorta el motivo", () => {
  assert.deepEqual(parseStudentStatusInput({ status: "inactive", reason: "  Abandono  " }), { isActive: false, reason: "Abandono" });
  assert.deepEqual(parseStudentStatusInput({ status: "active", reason: "Reincorporación" }), { isActive: true, reason: "Reincorporación" });
});

test("rechaza estado inválido, motivo vacío o demasiado largo", () => {
  const invalid = [
    null,
    {},
    { status: "baja", reason: "x" },
    { status: "inactive" },
    { status: "inactive", reason: "   " },
    { status: "inactive", reason: "x".repeat(501) },
  ];
  for (const body of invalid) {
    assert.throws(
      () => parseStudentStatusInput(body),
      (e: unknown) => e instanceof AppError && e.statusCode === 400 && e.code === "VALIDATION_ERROR",
      JSON.stringify(body),
    );
  }
  assert.doesNotThrow(() => parseStudentStatusInput({ status: "inactive", reason: "x".repeat(500) }));
});
