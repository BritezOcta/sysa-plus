/**
 * Datos de prueba para RF-11 (certificados): un alumno de la TUP con historia académica.
 *
 *   pnpm --filter backend db:seed:demo-certificados              → crea el alumno demo (DNI 39999999)
 *   pnpm --filter backend db:seed:demo-certificados -- create 40123456   → usa un alumno existente
 *   pnpm --filter backend db:seed:demo-certificados -- delete [dni]      → borra los datos de prueba
 *
 * Requiere la carrera TUP-2024 de `pnpm --filter backend db:seed:frgp`.
 * Carga: 2° cuat. 2025 → Programación I y Matemática promocionadas, Arquitectura regular + final 8;
 *        2° cuat. 2026 → cursando Programación II y Base de Datos I (comisión 2CN112).
 * Con eso se pueden emitir el certificado de alumno regular y el analítico parcial
 * (el analítico completo queda deshabilitado porque faltan materias).
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const TAG = "PRUEBA-RF11";
const DEMO_DNI = "39999999";
const DEMO_PASSWORD = "Alumno123!";

// pnpm reenvía el "--" separador como argumento: se descarta.
const args = process.argv.slice(2).filter((a) => a !== "--");
const mode = args[0] ?? "create";
const dni = args[1] ?? DEMO_DNI;
if (mode !== "create" && mode !== "delete") {
  throw new Error(`Modo inválido "${mode}". Usá: create [dni] | delete [dni]`);
}

async function findOrCreateStudent() {
  const existing = await prisma.user.findUnique({ where: { dni }, include: { studentProfile: true } });
  if (existing) {
    if (!existing.studentProfile) throw new Error(`El usuario con DNI ${dni} no es alumno.`);
    return existing.studentProfile;
  }
  if (dni !== DEMO_DNI) throw new Error(`No existe un usuario con DNI ${dni}.`);
  const user = await prisma.user.create({
    data: {
      dni,
      email: "alumno.certificados@demo.sysa.test",
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
      role: "ALUMNO",
      firstName: "Valentina",
      lastName: "Demo Certificados",
      studentProfile: { create: { legajo: "49999" } },
    },
    include: { studentProfile: true },
  });
  console.log(`Alumno demo creado: DNI ${dni} / clave ${DEMO_PASSWORD}`);
  return user.studentProfile!;
}

async function main() {
  const career = await prisma.career.findUnique({ where: { careerCode: "TUP-2024" }, include: { studyPlans: true } });
  if (!career) throw new Error("Falta la carrera TUP-2024. Corré primero: pnpm --filter backend db:seed:frgp");
  const plan = career.studyPlans.find((p) => p.isActive) ?? career.studyPlans[0]!;
  const sps = async (code: string) =>
    (await prisma.studyPlanSubject.findFirstOrThrow({ where: { studyPlanId: plan.studyPlanId, subject: { subjectCode: code } } }))
      .studyPlanSubjectId;

  if (mode === "delete") {
    const profile = await prisma.studentProfile.findFirst({ where: { user: { dni } } });
    const sc = profile
      ? await prisma.studentCareer.findUnique({ where: { studentId_careerId: { studentId: profile.studentId, careerId: career.careerId } } })
      : null;
    if (sc) {
      await prisma.certificate.deleteMany({ where: { studentCareerId: sc.studentCareerId } });
      await prisma.examEnrollment.deleteMany({ where: { studentCareerId: sc.studentCareerId } });
      await prisma.courseEnrollment.deleteMany({ where: { studentCareerId: sc.studentCareerId } });
      await prisma.studentStudyPlan.deleteMany({ where: { studentCareerId: sc.studentCareerId } });
      await prisma.studentCareer.delete({ where: { studentCareerId: sc.studentCareerId } });
    }
    await prisma.examEnrollment.deleteMany({ where: { examCall: { examSession: { examName: TAG } } } });
    await prisma.examCall.deleteMany({ where: { examSession: { examName: TAG } } });
    await prisma.examSession.deleteMany({ where: { examName: TAG } });
    await prisma.courseEnrollment.deleteMany({ where: { courseOffering: { commission: TAG } } });
    await prisma.courseOffering.deleteMany({ where: { commission: TAG } });
    console.log(`Datos de prueba de certificados eliminados (DNI ${dni}).`);
    return;
  }

  const profile = await findOrCreateStudent();
  const already = await prisma.studentCareer.findUnique({
    where: { studentId_careerId: { studentId: profile.studentId, careerId: career.careerId } },
  });
  if (already) {
    console.log(`El alumno ${dni} ya tiene datos en TUP-2024. Para recargarlos corré primero: ... -- delete ${dni}`);
    return;
  }
  const otherCareers = await prisma.studentCareer.count({ where: { studentId: profile.studentId } });
  if (otherCareers > 0) {
    console.warn(`Aviso: el alumno ${dni} ya tiene otra carrera; los certificados usan la primera carrera activa.`);
  }

  const period2025 = await prisma.academicPeriod.upsert({
    where: { year_semester: { year: 2025, semester: 2 } },
    update: {},
    create: { year: 2025, semester: 2, periodStartDate: new Date("2025-08-11"), periodEndDate: new Date("2025-12-06") },
  });
  const period2026 = await prisma.academicPeriod.findUnique({ where: { year_semester: { year: 2026, semester: 2 } } });
  if (!period2026) throw new Error("Falta el período 2° cuatrimestre 2026. Corré primero: pnpm --filter backend db:seed:frgp");

  const sc = await prisma.studentCareer.create({
    data: { studentId: profile.studentId, careerId: career.careerId, admissionYear: 2025, academicStatus: "ACTIVO" },
  });
  const ssp = await prisma.studentStudyPlan.create({ data: { studentCareerId: sc.studentCareerId, studyPlanId: plan.studyPlanId } });

  for (const [code, status] of [["TUP-01", "APROBADA"], ["TUP-03", "APROBADA"], ["TUP-02", "REGULAR"]] as const) {
    const studyPlanSubjectId = await sps(code);
    const offering =
      (await prisma.courseOffering.findFirst({ where: { studyPlanSubjectId, academicPeriodId: period2025.academicPeriodId, commission: TAG } })) ??
      (await prisma.courseOffering.create({
        data: { studyPlanSubjectId, academicPeriodId: period2025.academicPeriodId, commission: TAG, capacity: 40, offeringStatus: "CERRADA" },
      }));
    await prisma.courseEnrollment.create({
      data: { studentCareerId: sc.studentCareerId, courseOfferingId: offering.courseOfferingId, enrollmentStatus: status },
    });
  }

  const session =
    (await prisma.examSession.findFirst({ where: { examName: TAG } })) ??
    (await prisma.examSession.create({
      data: { examName: TAG, examYear: 2025, sessionStartDate: new Date("2025-12-09"), sessionEndDate: new Date("2025-12-20"), sessionStatus: "CERRADA" },
    }));
  const call =
    (await prisma.examCall.findFirst({ where: { examSessionId: session.examSessionId } })) ??
    (await prisma.examCall.create({
      data: { studyPlanSubjectId: await sps("TUP-02"), examSessionId: session.examSessionId, callDate: new Date("2025-12-12T18:00:00Z"), callStatus: "CERRADA" },
    }));
  await prisma.examEnrollment.create({
    data: { examCallId: call.examCallId, studentCareerId: sc.studentCareerId, studentStudyPlanId: ssp.studentStudyPlanId, examStatus: "APROBADO", examGrade: 8 },
  });

  for (const code of ["TUP-05", "TUP-07"]) {
    const offering = await prisma.courseOffering.findFirst({
      where: { studyPlanSubjectId: await sps(code), academicPeriodId: period2026.academicPeriodId, commission: "2CN112" },
    });
    if (!offering) throw new Error(`Falta la comisión 2CN112 de ${code}. Corré primero: pnpm --filter backend db:seed:frgp`);
    await prisma.courseEnrollment.create({
      data: { studentCareerId: sc.studentCareerId, courseOfferingId: offering.courseOfferingId, enrollmentStatus: "INSCRIPTO" },
    });
  }

  console.log(`✔ Datos de prueba de certificados cargados para el alumno ${dni} (TUP-2024).`);
}

main()
  .catch((error) => {
    console.error("Error en seed de certificados:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
