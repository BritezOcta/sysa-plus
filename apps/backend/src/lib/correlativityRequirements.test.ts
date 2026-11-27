import assert from "node:assert/strict";
import { test } from "node:test";
import type { SubjectStatus } from "../types/academicStatus.js";
import { evaluateRequirements } from "./correlativityRequirements.js";

const req = (id: number, type: string) => ({
  correlativityType: type,
  requiredSubject: { studyPlanSubjectId: id, subject: { subjectCode: `M${id}`, subjectName: `Materia ${id}` } },
});
const statuses = new Map<number, SubjectStatus>([
  [1, "REGULAR"],
  [2, "APROBADA"],
  [3, "CURSANDO"],
]);
const statusOf = (id: number) => statuses.get(id);

test("regular cumple regularizada_cursar; aprobada también", () => {
  const { toEnroll } = evaluateRequirements([req(1, "regularizada_cursar"), req(2, "regularizada_cursar")], statusOf);
  assert.deepEqual(
    toEnroll.map((r) => [r.studyPlanSubjectId, r.requiredCondition, r.met]),
    [
      [1, "REGULAR", true],
      [2, "REGULAR", true],
    ],
  );
  assert.equal(toEnroll[0]!.subjectName, "Materia 1");
});

test("regular no cumple aprobada_cursar ni aprobada_rendir", () => {
  const r = evaluateRequirements([req(1, "aprobada_cursar"), req(1, "aprobada_rendir"), req(2, "aprobada_rendir")], statusOf);
  assert.deepEqual(r.toEnroll.map((x) => [x.requiredCondition, x.met]), [["APROBADA", false]]);
  assert.deepEqual(
    r.forExam.map((x) => [x.studyPlanSubjectId, x.met]),
    [
      [1, false],
      [2, true],
    ],
  );
});

test("correlativa desconocida o inactiva no se cumple; cursando no cuenta como regular", () => {
  const { toEnroll } = evaluateRequirements([req(99, "regularizada_cursar"), req(3, "regularizada_cursar")], statusOf);
  assert.deepEqual(toEnroll.map((x) => x.met), [false, false]);
});

test("tipo de correlatividad desconocido se ignora", () => {
  const r = evaluateRequirements([req(1, "otro_tipo")], statusOf);
  assert.deepEqual([r.toEnroll.length, r.forExam.length], [0, 0]);
});
