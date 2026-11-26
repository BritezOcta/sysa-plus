import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !/;database=sysaplus_test_[a-z0-9_]+;/i.test(databaseUrl)) {
  throw new Error("TEST_DATABASE_URL debe apuntar a una base aislada sysaplus_test_*. Nunca uses la base de la aplicación.");
}
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "rf02-isolated-test-secret";
process.env.NODE_ENV = "test";

const { prisma } = await import("../src/lib/prisma.js");
const { createApp } = await import("../src/app.js");
const { signSessionToken } = await import("../src/lib/jwt.js");
const { academicService } = await import("../src/services/academic.service.js");
const { runAcademicTransaction } = await import("../src/repositories/academic.repository.js");

test("RF-02 API, SQL Server transactions and real enrollment data", async t => {
  // A new, migrated database is mandatory; fixtures never overwrite existing data.
  assert.equal(await prisma.user.count(), 0, "La base de pruebas debe estar vacía");
  const admin = await prisma.user.create({ data: { dni: "90000001", email: "admin@example.test", passwordHash: "unused", firstName: "Test", lastName: "Admin", role: "ADMINISTRADOR", administratorProfile: { create: {} } } });
  const student = await prisma.user.create({ data: { dni: "90000002", email: "student@example.test", passwordHash: "unused", firstName: "Test", lastName: "Student", role: "ALUMNO", studentProfile: { create: { legajo: "TEST-1" } } }, include: { studentProfile: true } });
  const teacher = await prisma.user.create({ data: { dni: "90000003", email: "teacher@example.test", passwordHash: "unused", firstName: "Test", lastName: "Teacher", role: "PROFESOR", teacherProfile: { create: {} } } });
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const actor = { userId: admin.userId, ipAddress: "127.0.0.1" };
  const cookie = (user: typeof admin) => `sysaplus_session=${signSessionToken(user.userId, user.role as "ADMINISTRADOR" | "ALUMNO" | "PROFESOR", 600)}`;
  async function request(route: string, method = "GET", body?: unknown, user: typeof admin | null = admin) {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/academic${route}`, {
      method,
      headers: { ...(user ? { cookie: cookie(user) } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }
  const careerBody = (code: string) => ({ code, name: `Career ${code}`, studyPlan: "Plan under test", durationYears: 3, status: "active", description: "Created by integration test" });
  const subjectBody = (careerId: string, code: string) => ({ careerId, code, name: `Subject ${code}`, weeklyHours: 4, totalHours: 64, year: 1, period: 1, status: "active", requirements: [] });
  let careerId: string, otherCareerId: string, subjectA: string, subjectB: string;
  try {
    await t.test("anonymous, students and teachers cannot manage academic data", async () => {
      assert.equal((await request("/snapshot", "GET", undefined, null)).status, 401);
      for (const user of [student, teacher]) {
        for (const [route, method] of [["/snapshot", "GET"], ["/careers", "POST"], ["/careers/1", "DELETE"], ["/subjects/1", "PUT"], ["/correlativities", "POST"]]) {
          assert.equal((await request(route!, method, method === "GET" ? undefined : {}, user)).status, 403);
        }
      }
      assert.equal((await request("/reset", "POST", {})).status, 404);
      assert.equal((await request("/audit-logs", "POST", {})).status, 404);
    });
    await t.test("reading an empty snapshot never inserts demo records", async () => {
      const snap = await request("/snapshot");
      assert.equal(snap.status, 200);
      assert.deepEqual(snap.data.careers, []);
      assert.deepEqual(snap.data.auditLogs, []);
      assert.equal(await prisma.career.count(), 0);
    });
    await t.test("creates careers and subjects with server audit and ignores forged counts", async () => {
      const career = await request("/careers", "POST", careerBody("TEST"));
      assert.equal(career.status, 201); careerId = career.data.id;
      otherCareerId = (await request("/careers", "POST", careerBody("OTHER"))).data.id;
      const a = await request("/subjects", "POST", { ...subjectBody(careerId, "A"), enrolledStudents: 9999 });
      assert.equal(a.status, 201); subjectA = a.data.id;
      const b = await request("/subjects", "POST", { ...subjectBody(careerId, "B"), requirements: [{ requiresSubjectId: subjectA, type: "aprobada_cursar" }] });
      assert.equal(b.status, 201); subjectB = b.data.id;
      const snap = (await request("/snapshot")).data;
      assert.equal(snap.subjects.find((s: { id: string }) => s.id === subjectA).enrolledStudents, 0);
      assert.equal(snap.auditLogs.length, 4);
      assert(snap.auditLogs.every((log: { user: string }) => log.user === "Test Admin"));
    });
    await t.test("duplicate creation and invalid bodies do not overwrite data", async () => {
      assert.equal((await request("/subjects", "POST", { ...subjectBody(careerId, "A"), name: "Overwritten" })).status, 409);
      assert.equal((await request("/careers", "POST", {})).status, 400);
      assert.equal((await request("/subjects", "POST", { ...subjectBody(careerId, "BAD"), period: 7 })).status, 400);
      assert.equal((await request(`/careers/${careerId}`, "PUT", { ...careerBody("TEST"), id: otherCareerId })).status, 400);
      const before = await prisma.career.count();
      assert.equal((await request(`/careers/${careerId}`, "PUT", { ...careerBody("TEST"), name: "Edited career" })).status, 200);
      assert.equal(await prisma.career.count(), before);
      assert.equal((await prisma.subject.findUniqueOrThrow({where:{subjectCode:"A"}})).subjectName, "Subject A");
    });
    await t.test("a deleted subject code can be reused without changing a linked catalog subject", async () => {
      const initial = await request("/subjects", "POST", subjectBody(careerId, "RECREATE"));
      assert.equal(initial.status, 201);
      assert.equal((await request(`/subjects/${initial.data.id}`, "DELETE")).status, 204);
      const replacement = await request("/subjects", "POST", { ...subjectBody(careerId, "RECREATE"), name: "Replacement" });
      assert.equal(replacement.status, 201);
      assert.notEqual(replacement.data.id, initial.data.id);
      assert.equal((await prisma.subject.findUniqueOrThrow({ where: { subjectCode: "RECREATE" } })).subjectName, "Replacement");
      assert.equal((await request("/subjects", "POST", { ...subjectBody(otherCareerId, "RECREATE"), name: "Must not overwrite" })).status, 409);
      assert.equal((await prisma.subject.findUniqueOrThrow({ where: { subjectCode: "RECREATE" } })).subjectName, "Replacement");
    });
    await t.test("cycles and cross-plan requirements are rejected without partial writes", async () => {
      const auditCount = await prisma.auditLog.count();
      const cycle = await request(`/subjects/${subjectA}`, "PUT", { ...subjectBody(careerId, "A"), name: "Must roll back", requirements: [{requiresSubjectId: subjectB, type:"aprobada_cursar"}] });
      assert.equal(cycle.status, 409); assert.equal(cycle.data.code, "CIRCULAR_CORRELATIVITY");
      assert.equal(await prisma.auditLog.count(), auditCount);
      assert.equal((await prisma.subject.findUniqueOrThrow({where:{subjectCode:"A"}})).subjectName, "Subject A");
      const other = (await request("/subjects", "POST", subjectBody(otherCareerId,"C"))).data.id;
      assert.equal((await request("/correlativities", "POST", {targetSubjectId:subjectA, requiresSubjectId:other, type:"aprobada_cursar"})).status, 400);
      assert.equal((await request(`/subjects/${subjectA}`, "PUT", {...subjectBody(careerId,"A"), requirements:[{requiresSubjectId:other,type:"aprobada_cursar"}]})).status, 400);
    });
    await t.test("a failed audit rolls back the domain mutation", async () => {
      await assert.rejects(academicService.saveCareer({...careerBody("ROLLBACK"),status:"active"},{userId:2147483647,ipAddress:null}));
      assert.equal(await prisma.career.count({where:{careerCode:"ROLLBACK"}}),0);
    });
    await t.test("legacy null career fields do not affect slot or status mapping", async () => {
      assert.equal((await request(`/subjects/${subjectA}/slot`,"PATCH",{year:2,period:"anual"})).status,200);
      assert.equal((await request(`/subjects/${subjectA}/status`,"PATCH",{status:"inactive"})).status,200);
      const subject=(await request("/snapshot")).data.subjects.find((s:{id:string})=>s.id===subjectA);
      assert.equal(subject.careerId,careerId); assert.equal(subject.period,"anual"); assert.equal(subject.status,"inactive");
    });
    await t.test("real enrollments block deletion; late FK failures preserve prerequisites", async () => {
      const period=await prisma.academicPeriod.create({data:{year:2026,semester:1,periodStartDate:new Date("2026-01-01"),periodEndDate:new Date("2026-12-31")}});
      const offering=await prisma.courseOffering.create({data:{studyPlanSubjectId:Number(subjectA),academicPeriodId:period.academicPeriodId,commission:"TEST",capacity:30,offeringStatus:"ABIERTA"}});
      const sc=await prisma.studentCareer.create({data:{studentId:student.studentProfile!.studentId,careerId:Number(careerId),admissionYear:2026,academicStatus:"ACTIVO"}});
      await prisma.courseEnrollment.create({data:{studentCareerId:sc.studentCareerId,courseOfferingId:offering.courseOfferingId,enrollmentStatus:"INSCRIPTO"}});
      const before=await prisma.subjectCorrelativity.count();
      assert.equal((await request(`/subjects/${subjectA}`,"DELETE")).status,409);
      assert.equal((await request(`/careers/${careerId}`,"DELETE")).status,409);
      await assert.rejects(runAcademicTransaction(repo=>repo.deleteStudyPlanSubjectCascadeCorrelativities(Number(subjectA))));
      assert.equal(await prisma.subjectCorrelativity.count(),before);
      assert.equal((await request("/snapshot")).data.subjects.find((s:{id:string})=>s.id===subjectA).enrolledStudents,1);
    });
    await t.test("simultaneous opposing edges cannot commit a cycle", async () => {
      const x=(await request("/subjects","POST",subjectBody(otherCareerId,"X"))).data.id;
      const y=(await request("/subjects","POST",subjectBody(otherCareerId,"Y"))).data.id;
      const outcomes=await Promise.allSettled([
        academicService.connectCorrelativity({targetSubjectId:x,requiresSubjectId:y,type:"aprobada_cursar"},actor),
        academicService.connectCorrelativity({targetSubjectId:y,requiresSubjectId:x,type:"aprobada_cursar"},actor),
      ]);
      assert.equal(outcomes.filter(r=>r.status==="fulfilled").length,1);
      assert.equal(await prisma.subjectCorrelativity.count({where:{targetSubjectId:{in:[Number(x),Number(y)]}}}),1);
    });
    await t.test("repeated reads preserve edits and omit fabricated historical seed logs", async () => {
      await prisma.auditLog.create({data:{action:"ALTA",entity:"CARRERA",details:"Historical seed event",userId:null}});
      await prisma.$disconnect();
      const snap=(await request("/snapshot")).data;
      assert.equal(snap.careers.find((c:{id:string})=>c.id===careerId).name,"Edited career");
      assert(!snap.auditLogs.some((log:{details:string})=>log.details==="Historical seed event"));
      assert.equal((await request(`/careers/${otherCareerId}/status`,"PATCH",{status:"inactive"})).status,200);
      assert.equal((await request(`/careers/${otherCareerId}/status`,"PATCH",{status:"inactive"})).data.status,"inactive");
    });
  } finally {
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    await prisma.$disconnect();
  }
});
