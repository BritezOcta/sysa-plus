import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../src/lib/AppError.js";
import { careerInput, positiveId, subjectInput, subjectSlot } from "../src/lib/academic.validation.js";

const career = { code: "TEST", name: "Test career", studyPlan: "Test plan", durationYears: 3, status: "active" };
const subject = { careerId: "1", code: "A", name: "A", weeklyHours: 4, totalHours: 64, year: 1, period: 1, status: "active", requirements: [] };
const invalid = (fn: () => unknown) => assert.throws(fn, (error: unknown) => error instanceof AppError && error.statusCode === 400);

test("malformed bodies and invalid values are business errors, not TypeErrors", () => {
  for (const body of [null, [], undefined, {}, { ...career, name: {} }, { ...career, durationYears: -1 }, { ...career, status: "disabled" }]) invalid(() => careerInput(body));
  for (const id of [null, true, "", "1.5", "-1", "1e2", "2147483648", {}]) invalid(() => positiveId(id));
});

test("PUT uses the route id; POST cannot edit an existing entity", () => {
  assert.equal(careerInput(career, "12").id, "12");
  invalid(() => careerInput({ ...career, id: "13" }, "12"));
  invalid(() => careerInput({ ...career, id: "12" }));
});

test("a subject cannot forge enrollment counts or send malformed requirements", () => {
  const input = subjectInput({ ...subject, enrolledStudents: 9999 });
  assert.equal("enrolledStudents" in input, false);
  for (const patch of [{ requirements: null }, { requirements: [null] }, { requirements: [{ requiresSubjectId: "2", type: "anything" }] }, { weeklyHours: 0 }, { totalHours: 1.5 }]) invalid(() => subjectInput({ ...subject, ...patch }));
});

test("annual, semester and unassigned slots are validated without inventing defaults", () => {
  assert.deepEqual(subjectSlot({year: null, period: null}), {year: null, period: null});
  assert.deepEqual(subjectSlot({year: 3, period: "anual"}), {year: 3, period: "anual"});
  for (const slot of [{ year: 0, period: 1 }, { year: 1, period: "3" }, {year: null, period: 1}, {year: 1, period: null}]) invalid(() => subjectSlot(slot));
});

test("grading criteria preserve decimal values and reject invalid types or thresholds", () => {
  const input = subjectInput({ ...subject, regularGrade: 6.5, promotionGrade: 8.5 });
  assert.equal(input.regularGrade, 6.5);
  assert.equal(input.promotionGrade, 8.5);
  assert.equal(subjectInput(subject).regularGrade, 6);
  assert.equal(subjectInput(subject).promotionGrade, null);
  for (const patch of [{ regularGrade: true }, { regularGrade: "6" }, { regularGrade: null }, { regularGrade: 0 }, { regularGrade: 11 }, { promotionGrade: 5 }, { promotionGrade: 11 }, { promotionGrade: "8" }]) invalid(() => subjectInput({ ...subject, ...patch }));
});
