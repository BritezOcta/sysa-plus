import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !/;database=sysaplus_test_[a-z0-9_]+;/i.test(databaseUrl)) {
  throw new Error("TEST_DATABASE_URL debe apuntar a una base aislada sysaplus_test_*. Nunca uses la base de la aplicación.");
}
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "student-status-isolated-test-secret";
process.env.NODE_ENV = "test";

const { prisma } = await import("../src/lib/prisma.js");
const { createApp } = await import("../src/app.js");
const { signSessionToken } = await import("../src/lib/jwt.js");

const day = (offset: number) => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset));
};
/** Hora "de pared" local guardada en campos UTC, como guarda CALL_DATE el calendario de mesas. */
const wallClock = (offsetHours: number) => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + offsetHours, now.getMinutes()));
};
const PASSWORD = "Alumno123!";

test("RF-10: baja y reactivación de alumnos", async (t) => {
  assert.equal(await prisma.user.count(), 0, "La base de pruebas debe estar vacía");

  const admin = await prisma.user.create({
    data: { dni: "92000001", email: "admin@example.test", passwordHash: "unused", firstName: "Ada", lastName: "Admin", role: "ADMINISTRADOR", administratorProfile: { create: {} } },
  });
  const teacher = await prisma.user.create({
    data: { dni: "92000002", email: "prof@example.test", passwordHash: "unused", firstName: "Pablo", lastName: "Profe", role: "PROFESOR", teacherProfile: { create: {} } },
  });
  const student = await prisma.user.create({
    data: {
      dni: "92000003", email: "alumna@example.test", passwordHash: await bcrypt.hash(PASSWORD, 4), firstName: "Ana", lastName: "Alumna",
      role: "ALUMNO", studentProfile: { create: { legajo: "ST-1" } },
    },
    include: { studentProfile: true },
  });

  const career = await prisma.career.create({ data: { careerName: "Carrera RF10", careerCode: "RF10" } });
  const plan = await prisma.studyPlan.create({ data: { careerId: career.careerId, resolution: "Plan RF10" } });
  const subject = await prisma.subject.create({ data: { subjectCode: "RF10-1", subjectName: "Materia RF10" } });
  const sps = await prisma.studyPlanSubject.create({ data: { studyPlanId: plan.studyPlanId, subjectId: subject.subjectId } });
  const sc = await prisma.studentCareer.create({
    data: { studentId: student.studentProfile!.studentId, careerId: career.careerId, admissionYear: 2090, academicStatus: "ACTIVO" },
  });
  const ssp = await prisma.studentStudyPlan.create({ data: { studentCareerId: sc.studentCareerId, studyPlanId: plan.studyPlanId } });

  const period = (semester: number, start: number, end: number) =>
    prisma.academicPeriod.create({ data: { year: 2090, semester, periodStartDate: day(start), periodEndDate: day(end) } });
  const past = await period(0, -400, -200);
  const current = await period(1, -30, 30);
  const upcoming = await period(2, 60, 180);
  const course = async (academicPeriodId: number, enrollmentStatus: string) => {
    const offering = await prisma.courseOffering.create({
      data: { studyPlanSubjectId: sps.studyPlanSubjectId, academicPeriodId, commission: "K1", capacity: 30, offeringStatus: "ABIERTA" },
    });
    return prisma.courseEnrollment.create({ data: { studentCareerId: sc.studentCareerId, courseOfferingId: offering.courseOfferingId, enrollmentStatus } });
  };
  const historical = await course(past.academicPeriodId, "REGULAR");
  const inProgress = await course(current.academicPeriodId, "INSCRIPTO");
  const future = await course(upcoming.academicPeriodId, "INSCRIPTO");

  const session = await prisma.examSession.create({
    data: { examName: "Turno RF10", examYear: 2090, sessionStartDate: day(-5), sessionEndDate: day(5), sessionStatus: "ABIERTO" },
  });
  const exam = async (offsetDays: number, callDate: Date = day(offsetDays)) => {
    const call = await prisma.examCall.create({
      data: { studyPlanSubjectId: sps.studyPlanSubjectId, examSessionId: session.examSessionId, callDate, callStatus: "ABIERTA" },
    });
    return prisma.examEnrollment.create({
      data: { examCallId: call.examCallId, studentCareerId: sc.studentCareerId, studentStudyPlanId: ssp.studentStudyPlanId, examStatus: "INSCRIPTO" },
    });
  };
  const pastExam = await exam(-1);
  const futureExam = await exam(1);
  const earlierToday = await exam(0, wallClock(-2));
  const laterToday = await exam(0, wallClock(2));

  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const adminCookie = `sysaplus_session=${signSessionToken(admin.userId, "ADMINISTRADOR", 600)}`;

  async function setStatus(userId: number, body: unknown) {
    const response = await fetch(`${base}/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { cookie: adminCookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  }
  async function login() {
    const response = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni: student.dni, password: PASSWORD }),
    });
    return { status: response.status, data: await response.json() };
  }
  const courseStatus = async (id: number) =>
    (await prisma.courseEnrollment.findUniqueOrThrow({ where: { courseEnrollmentId: id } })).enrollmentStatus;
  const examStatus = async (id: number) =>
    (await prisma.examEnrollment.findUniqueOrThrow({ where: { examEnrollmentId: id } })).examStatus;
  const auditCount = () => prisma.auditLog.count({ where: { action: { in: ["STUDENT_DEACTIVATED", "STUDENT_REACTIVATED"] } } });

  try {
    await t.test("la baja cancela solo lo futuro y audita el motivo", async () => {
      const res = await setStatus(student.userId, { status: "inactive", reason: "Abandono" });
      assert.equal(res.status, 200, JSON.stringify(res.data));
      assert.equal(res.data.isActive, false);
      assert.equal(res.data.cancelledCourses, 1);
      assert.equal(res.data.cancelledExams, 2);
      assert.equal(await courseStatus(inProgress.courseEnrollmentId), "INSCRIPTO");
      assert.equal(await courseStatus(future.courseEnrollmentId), "CANCELADA");
      assert.equal(await courseStatus(historical.courseEnrollmentId), "REGULAR");
      assert.equal(await examStatus(pastExam.examEnrollmentId), "INSCRIPTO");
      assert.equal(await examStatus(futureExam.examEnrollmentId), "CANCELADA");
      assert.equal(await examStatus(earlierToday.examEnrollmentId), "INSCRIPTO", "final de hoy que ya pasó");
      assert.equal(await examStatus(laterToday.examEnrollmentId), "CANCELADA", "final de hoy más tarde");
      const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: "STUDENT_DEACTIVATED" } });
      assert.equal(audit.userId, admin.userId);
      assert.equal(audit.entityId, String(student.userId));
      assert.match(audit.details ?? "", /Abandono/);
    });

    await t.test("el alumno dado de baja no puede iniciar sesión", async () => {
      const res = await login();
      assert.equal(res.status, 403);
      assert.equal(res.data.code, "ACCOUNT_INACTIVE");
    });

    await t.test("repetir el mismo estado responde NO_CHANGES", async () => {
      const before = await auditCount();
      const res = await setStatus(student.userId, { status: "inactive", reason: "Otra vez" });
      assert.equal(res.status, 409);
      assert.equal(res.data.code, "NO_CHANGES");
      assert.equal(await auditCount(), before);
    });

    await t.test("dos bajas simultáneas: una 200 y otra NO_CHANGES", async () => {
      assert.equal((await setStatus(student.userId, { status: "active", reason: "Reincorporación" })).status, 200);
      const results = await Promise.all([
        setStatus(student.userId, { status: "inactive", reason: "Sanción A" }),
        setStatus(student.userId, { status: "inactive", reason: "Sanción B" }),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      assert.equal(results.find((r) => r.status === 409)!.data.code, "NO_CHANGES");
    });

    await t.test("reactivar devuelve el acceso y no restaura inscripciones", async () => {
      await prisma.user.update({ where: { userId: student.userId }, data: { lockedUntil: day(1), failedLoginAttempts: 5 } });
      const res = await setStatus(student.userId, { status: "active", reason: "Reincorporación" });
      assert.equal(res.status, 200);
      assert.equal(res.data.isActive, true);
      assert.equal(await courseStatus(future.courseEnrollmentId), "CANCELADA");
      const user = await prisma.user.findUniqueOrThrow({ where: { userId: student.userId } });
      assert.equal(user.lockedUntil, null);
      assert.equal(user.failedLoginAttempts, 0);
      assert.equal((await login()).status, 200);
    });

    await t.test("no aplica a profesores ni a usuarios inexistentes, y exige motivo", async () => {
      const prof = await setStatus(teacher.userId, { status: "inactive", reason: "x" });
      assert.equal(prof.status, 409);
      assert.equal(prof.data.code, "NOT_A_STUDENT");
      const missing = await setStatus(999999, { status: "inactive", reason: "x" });
      assert.equal(missing.status, 404);
      assert.equal(missing.data.code, "USER_NOT_FOUND");
      const noReason = await setStatus(student.userId, { status: "inactive", reason: "  " });
      assert.equal(noReason.status, 400);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { userId: student.userId } })).isActive, true);
    });

    await t.test("el filtro de estado del listado", async () => {
      await setStatus(student.userId, { status: "inactive", reason: "Abandono" });
      const get = async (status: string) => {
        const response = await fetch(`${base}/admin/users?role=ALUMNO&status=${status}`, { headers: { cookie: adminCookie } });
        return ((await response.json()) as { users: { id: string }[] }).users.map((u) => u.id);
      };
      assert.deepEqual(await get("inactive"), [String(student.userId)]);
      assert.deepEqual(await get("active"), []);
    });
  } finally {
    server.close();
    await prisma.$disconnect();
  }
});
