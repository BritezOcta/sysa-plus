import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !/;database=sysaplus_test_[a-z0-9_]+;/i.test(databaseUrl)) {
  throw new Error("TEST_DATABASE_URL debe apuntar a una base aislada sysaplus_test_*. Nunca uses la base de la aplicación.");
}
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "student-courses-isolated-test-secret";
process.env.NODE_ENV = "test";

const { prisma } = await import("../src/lib/prisma.js");
const { createApp } = await import("../src/app.js");
const { signSessionToken } = await import("../src/lib/jwt.js");

const day = (offset: number) => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset));
};

test("cursadas del alumno y encuesta docente anónima", async (t) => {
  assert.equal(await prisma.user.count(), 0, "La base de pruebas debe estar vacía");

  const newStudent = (n: number) =>
    prisma.user.create({
      data: {
        dni: `9100000${n}`, email: `student${n}@example.test`, passwordHash: "unused", firstName: "Test", lastName: `Student${n}`,
        role: "ALUMNO", studentProfile: { create: { legajo: `SC-${n}` } },
      },
      include: { studentProfile: true },
    });
  const owner = await newStudent(1);
  const other = await newStudent(2);

  const career = await prisma.career.create({ data: { careerName: "Carrera de prueba", careerCode: "SCTEST" } });
  const plan = await prisma.studyPlan.create({ data: { careerId: career.careerId, resolution: "Plan de prueba" } });
  const subject = await prisma.subject.create({ data: { subjectCode: "SC1", subjectName: "Materia de prueba" } });
  const sps = await prisma.studyPlanSubject.create({ data: { studyPlanId: plan.studyPlanId, subjectId: subject.subjectId } });
  const current = await prisma.academicPeriod.create({ data: { year: 2090, semester: 1, periodStartDate: day(-30), periodEndDate: day(30) } });
  const upcoming = await prisma.academicPeriod.create({ data: { year: 2090, semester: 2, periodStartDate: day(60), periodEndDate: day(180) } });
  const offering = (academicPeriodId: number) =>
    prisma.courseOffering.create({
      data: { studyPlanSubjectId: sps.studyPlanSubjectId, academicPeriodId, commission: "T1", capacity: 30, offeringStatus: "ACTIVE" },
    });
  const currentOffering = await offering(current.academicPeriodId);
  const upcomingOffering = await offering(upcoming.academicPeriodId);
  const enroll = async (studentId: number, courseOfferingId: number) => {
    const sc = await prisma.studentCareer.upsert({
      where: { studentId_careerId: { studentId, careerId: career.careerId } },
      create: { studentId, careerId: career.careerId, admissionYear: 2090, academicStatus: "ACTIVO" },
      update: {},
    });
    return prisma.courseEnrollment.create({ data: { studentCareerId: sc.studentCareerId, courseOfferingId, enrollmentStatus: "INSCRIPTO" } });
  };
  const ownerCurrent = await enroll(owner.studentProfile!.studentId, currentOffering.courseOfferingId);
  const ownerUpcoming = await enroll(owner.studentProfile!.studentId, upcomingOffering.courseOfferingId);
  const otherCurrent = await enroll(other.studentProfile!.studentId, currentOffering.courseOfferingId);

  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const cookie = (userId: number) => `sysaplus_session=${signSessionToken(userId, "ALUMNO", 600)}`;
  async function request(route: string, userId: number, body?: unknown) {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/student/courses${route}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { cookie: cookie(userId), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  const answers = { answers: [5, 4, 3, 4, 5] };

  try {
    await t.test("una cursada de un período futuro figura como INSCRIPTO y sin encuesta", async () => {
      const { status, data } = await request("", owner.userId);
      assert.equal(status, 200);
      const future = data.courses.find((c: { enrollmentId: string }) => c.enrollmentId === String(ownerUpcoming.courseEnrollmentId));
      assert.equal(future.condition, "INSCRIPTO");
      assert.equal(future.survey, "NOT_AVAILABLE");
      const now = data.courses.find((c: { enrollmentId: string }) => c.enrollmentId === String(ownerCurrent.courseEnrollmentId));
      assert.equal(now.condition, "CURSANDO");
      assert.equal(now.survey, "AVAILABLE");
    });

    await t.test("la cursada de otro alumno responde 404 y no escribe nada", async () => {
      const res = await request(`/${otherCurrent.courseEnrollmentId}/survey`, owner.userId, answers);
      assert.equal(res.status, 404);
      assert.equal(res.data.code, "ENROLLMENT_NOT_FOUND");
      assert.equal(await prisma.surveySubmission.count(), 0);
      assert.equal(await prisma.surveyResponse.count(), 0);
    });

    await t.test("dos envíos simultáneos: uno 201, el otro 409, una sola respuesta guardada", async () => {
      const route = `/${ownerCurrent.courseEnrollmentId}/survey`;
      const results = await Promise.all([request(route, owner.userId, answers), request(route, owner.userId, answers)]);
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
      assert.equal(results.find((r) => r.status === 409)!.data.code, "SURVEY_ALREADY_ANSWERED");
      assert.equal(await prisma.surveySubmission.count(), 1);
      assert.equal(await prisma.surveyResponse.count(), 1);
      const again = await request(route, owner.userId, answers);
      assert.equal(again.status, 409);
      assert.equal(await prisma.surveyResponse.count(), 1);
    });
  } finally {
    server.close();
    await prisma.$disconnect();
  }
});
