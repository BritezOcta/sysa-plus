/**
 * Inscripciones simultáneas (cursada y examen): el bloqueo por fila de runWithEnrollmentLocks
 * tiene que respetar el cupo y las validaciones del alumno aunque los pedidos lleguen a la vez.
 *
 *   TEST_DATABASE_URL="sqlserver://...;database=sysaplus_test_<algo>;..." pnpm exec tsx --test tests/enrollmentConcurrency.integration.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !/;database=sysaplus_test_[a-z0-9_]+;/i.test(databaseUrl)) {
  throw new Error("TEST_DATABASE_URL debe apuntar a una base aislada sysaplus_test_*. Nunca uses la base de la aplicación.");
}
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "enrollment-concurrency-isolated-test-secret";
process.env.NODE_ENV = "test";

const { prisma } = await import("../src/lib/prisma.js");
const { createApp } = await import("../src/app.js");
const { signSessionToken } = await import("../src/lib/jwt.js");
const { timeFromString } = await import("../src/lib/schedule.js");

const STUDENTS = 20;
const CAPACITY = 5;

const day = (offset: number) => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset));
};

test("inscripciones simultáneas respetan cupo y validaciones del alumno", async (t) => {
  assert.equal(await prisma.user.count(), 0, "La base de pruebas debe estar vacía");

  // --- Materias: A (regular, para rendir), B (cupo chico), C y D (mismo horario), E (doble clic) ---
  const career = await prisma.career.create({ data: { careerName: "Carrera concurrencia", careerCode: "CONC" } });
  const plan = await prisma.studyPlan.create({ data: { careerId: career.careerId, resolution: "Plan concurrencia" } });
  const sps: Record<"A" | "B" | "C" | "D" | "E", number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const key of Object.keys(sps) as (keyof typeof sps)[]) {
    const subject = await prisma.subject.create({ data: { subjectCode: `CONC-${key}`, subjectName: `Materia ${key}` } });
    const row = await prisma.studyPlanSubject.create({
      data: { studyPlanId: plan.studyPlanId, subjectId: subject.subjectId, subjectYear: 1, semester: 1 },
    });
    sps[key] = row.studyPlanSubjectId;
  }

  const past = await prisma.academicPeriod.create({
    data: { year: 2090, semester: 1, periodStartDate: day(-200), periodEndDate: day(-100) },
  });
  const current = await prisma.academicPeriod.create({
    data: {
      year: 2090, semester: 2, periodStartDate: day(30), periodEndDate: day(150),
      enrollmentStartDate: day(-1), enrollmentEndDate: day(10),
    },
  });

  const offering = async (
    key: keyof typeof sps, academicPeriodId: number, commission: string, capacity: number, dayOfWeek: number, status = "ABIERTA",
  ) =>
    prisma.courseOffering.create({
      data: {
        studyPlanSubjectId: sps[key], academicPeriodId, commission, capacity, offeringStatus: status,
        schedules: { create: [{ dayOfWeek, startTime: timeFromString("18:00"), endTime: timeFromString("22:00") }] },
      },
    });
  const pastA = await offering("A", past.academicPeriodId, "P1", 100, 1, "CERRADA");
  const small = await offering("B", current.academicPeriodId, "K1", CAPACITY, 1);
  // C y D: mismo horario (martes 18-22) entre sí, distinto de K1 y de E.
  const overlapC = await offering("C", current.academicPeriodId, "K2", 100, 2);
  const overlapD = await offering("D", current.academicPeriodId, "K3", 100, 2);
  const free = await offering("E", current.academicPeriodId, "K4", 100, 3);

  const session = await prisma.examSession.create({
    data: {
      examName: "Turno concurrencia", examYear: 2090, sessionStartDate: day(5), sessionEndDate: day(15),
      sessionStatus: "ABIERTO", enrollmentStartDate: day(-1), enrollmentEndDate: day(4),
    },
  });
  const call = await prisma.examCall.create({
    data: { studyPlanSubjectId: sps.A, examSessionId: session.examSessionId, callDate: day(10), callStatus: "ABIERTA", capacity: CAPACITY },
  });

  // --- Alumnos: todos con A regular (habilitados a rendirla) -----------------------------------
  const cookies: string[] = [];
  for (let i = 1; i <= STUDENTS + 1; i++) {
    const user = await prisma.user.create({
      data: {
        dni: String(93000000 + i), email: `conc${i}@example.test`, passwordHash: "unused", firstName: "Alumno", lastName: `${i}`,
        role: "ALUMNO", studentProfile: { create: { legajo: `CONC-${i}` } },
      },
      include: { studentProfile: true },
    });
    const sc = await prisma.studentCareer.create({
      data: { studentId: user.studentProfile!.studentId, careerId: career.careerId, admissionYear: 2090, academicStatus: "ACTIVO" },
    });
    await prisma.studentStudyPlan.create({ data: { studentCareerId: sc.studentCareerId, studyPlanId: plan.studyPlanId } });
    await prisma.courseEnrollment.create({
      data: { studentCareerId: sc.studentCareerId, courseOfferingId: pastA.courseOfferingId, enrollmentStatus: "REGULAR", enrollmentDate: day(-200) },
    });
    cookies.push(`sysaplus_session=${signSessionToken(user.userId, "ALUMNO", 600)}`);
  }
  // El alumno STUDENTS + 1 queda aparte para los casos de un mismo alumno.
  const soloCookie = cookies.pop()!;

  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;

  const post = async (path: string, cookie: string, body: unknown) => {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { code?: string };
    return { status: response.status, code: data.code };
  };
  const tally = (results: { status: number; code?: string | undefined }[]) =>
    results.reduce<Record<string, number>>((acc, r) => {
      const key = r.status === 201 ? "201" : `${r.status} ${r.code}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  try {
    await t.test(`cursada: ${STUDENTS} alumnos a la vez contra cupo ${CAPACITY} → entran exactamente ${CAPACITY}`, async () => {
      const results = await Promise.all(cookies.map((c) => post("/course-enrollments", c, { courseOfferingId: small.courseOfferingId })));
      assert.deepEqual(tally(results), { "201": CAPACITY, "409 COMMISSION_FULL": STUDENTS - CAPACITY });
      assert.equal(
        await prisma.courseEnrollment.count({ where: { courseOfferingId: small.courseOfferingId, enrollmentStatus: "INSCRIPTO" } }),
        CAPACITY,
      );
    });

    await t.test(`examen: ${STUDENTS} alumnos a la vez contra cupo ${CAPACITY} → entran exactamente ${CAPACITY}`, async () => {
      const results = await Promise.all(cookies.map((c) => post("/exam-enrollments", c, { examCallId: call.examCallId })));
      assert.deepEqual(tally(results), { "201": CAPACITY, "409 CALL_FULL": STUDENTS - CAPACITY });
      assert.equal(await prisma.examEnrollment.count({ where: { examCallId: call.examCallId, examStatus: "INSCRIPTO" } }), CAPACITY);
    });

    await t.test("un alumno se anota a la vez a dos comisiones con el mismo horario → solo una", async () => {
      const results = await Promise.all([
        post("/course-enrollments", soloCookie, { courseOfferingId: overlapC.courseOfferingId }),
        post("/course-enrollments", soloCookie, { courseOfferingId: overlapD.courseOfferingId }),
      ]);
      assert.deepEqual(tally(results), { "201": 1, "409 SCHEDULE_CONFLICT": 1 });
    });

    await t.test("doble clic: la misma comisión dos veces a la vez → una sola inscripción", async () => {
      const results = await Promise.all([
        post("/course-enrollments", soloCookie, { courseOfferingId: free.courseOfferingId }),
        post("/course-enrollments", soloCookie, { courseOfferingId: free.courseOfferingId }),
      ]);
      assert.deepEqual(tally(results), { "201": 1, "409 ALREADY_ENROLLED": 1 });
      assert.equal(await prisma.courseEnrollment.count({ where: { courseOfferingId: free.courseOfferingId } }), 1);
    });
  } finally {
    server.close();
    await prisma.$disconnect();
  }
});
