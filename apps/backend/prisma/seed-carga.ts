/**
 * Datos para las pruebas de carga (k6, carpeta loadtest/ en la raíz).
 *
 * Crea una carrera propia (código CARGA) con N alumnos que tienen historial (cursadas cerradas
 * con asistencias) y cursadas en curso, más la comisión "PICO" con cupo limitado para el
 * escenario de pico de inscripción.
 *
 * Es re-ejecutable: primero borra todo lo que creó una corrida anterior, incluidas las
 * inscripciones, avisos y auditoría que generaron las pruebas. Correrlo antes de cada prueba
 * de pico, así la comisión vuelve a tener el cupo libre. No toca datos que no sean de carga.
 *
 * Uso (con Docker levantado):
 *   docker exec sysaplus-backend pnpm db:seed:carga
 *   docker exec -e CARGA_ALUMNOS=1000 -e CARGA_CUPO_PICO=80 sysaplus-backend pnpm db:seed:carga
 *
 * Requiere un período con la inscripción abierta hoy y uno ya terminado (los crea db:seed:demo).
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { ATTENDANCE_STATUS } from "../src/lib/attendance.js";
import { timeFromString } from "../src/lib/schedule.js";
import { ENROLLMENT_STATUS, OFFERING_STATUS } from "../src/types/academic.js";

const CAREER_CODE = "CARGA";
const EMAIL_DOMAIN = "@carga.sysa.test";
const DNI_BASE = 70_000_000;
const PASSWORD = "Carga123!";
const CLASSES_PER_OFFERING = 12;
/** Filas por INSERT: SQL Server admite hasta 2100 parámetros por sentencia. */
const CHUNK = 250;

function positiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} tiene que ser un entero positivo`);
  return value;
}

const STUDENTS = positiveIntEnv("CARGA_ALUMNOS", 500);
const PEAK_CAPACITY = positiveIntEnv("CARGA_CUPO_PICO", 50);
if (STUDENTS > 999_999) throw new Error("CARGA_ALUMNOS no puede superar 999999 (rango de DNI 70000000-70999999)");

const SUBJECTS = [
  { code: "CARGA-1", name: "Carga · Matemática", semester: 1 },
  { code: "CARGA-2", name: "Carga · Programación", semester: 1 },
  { code: "CARGA-3", name: "Carga · Sistemas", semester: 1 },
  { code: "CARGA-4", name: "Carga · Bases de Datos", semester: 2 },
  { code: "CARGA-5", name: "Carga · Redes", semester: 2 },
  { code: "CARGA-6", name: "Carga · Inglés", semester: 2 },
] as const;

async function inChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

/** Borra todo lo de una corrida anterior, de las hojas hacia la raíz de las claves foráneas. */
async function reset() {
  const ofCareer = { career: { careerCode: CAREER_CODE } };
  const offeringOfCareer = { studyPlanSubject: { studyPlan: ofCareer } };
  const enrollment = { OR: [{ studentCareer: ofCareer }, { courseOffering: offeringOfCareer }] };
  const loadUser = { email: { endsWith: EMAIL_DOMAIN } };

  await prisma.attendance.deleteMany({ where: { courseEnrollment: enrollment } });
  await prisma.assessmentGrade.deleteMany({ where: { courseEnrollment: enrollment } });
  await prisma.studentObservation.deleteMany({ where: { courseEnrollment: enrollment } });
  await prisma.surveySubmission.deleteMany({ where: { courseEnrollment: enrollment } });
  await prisma.courseEnrollment.deleteMany({ where: enrollment });
  await prisma.examEnrollment.deleteMany({ where: { studentCareer: ofCareer } });
  await prisma.certificate.deleteMany({ where: { studentCareer: ofCareer } });

  await prisma.classSession.deleteMany({ where: { courseOffering: offeringOfCareer } });
  await prisma.courseSchedule.deleteMany({ where: { courseOffering: offeringOfCareer } });
  await prisma.teacherAssignment.deleteMany({ where: { courseOffering: offeringOfCareer } });
  await prisma.assessment.deleteMany({ where: { courseOffering: offeringOfCareer } });
  await prisma.surveyResponse.deleteMany({ where: { courseOffering: offeringOfCareer } });
  await prisma.courseOffering.deleteMany({ where: offeringOfCareer });

  await prisma.studentStudyPlan.deleteMany({ where: { studentCareer: ofCareer } });
  await prisma.studentCareer.deleteMany({ where: ofCareer });
  await prisma.studentProfile.deleteMany({ where: { user: loadUser } });
  await prisma.auditLog.deleteMany({ where: { user: loadUser } });
  // Los avisos se borran en cascada con el usuario.
  await prisma.user.deleteMany({ where: loadUser });

  await prisma.studyPlanSubject.deleteMany({ where: { studyPlan: ofCareer } });
  await prisma.subject.deleteMany({ where: { subjectCode: { startsWith: `${CAREER_CODE}-` } } });
  await prisma.studyPlan.deleteMany({ where: ofCareer });
  await prisma.career.deleteMany({ where: { careerCode: CAREER_CODE } });
}

async function main() {
  const startedAt = Date.now();
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const periods = await prisma.academicPeriod.findMany({ orderBy: [{ year: "desc" }, { semester: "desc" }] });
  const current = periods.find(
    (p) => p.enrollmentStartDate && p.enrollmentEndDate && p.enrollmentStartDate <= today && today <= p.enrollmentEndDate,
  );
  const previous = periods.find((p) => p.periodEndDate < today);
  if (!current || !previous) {
    throw new Error(
      "Hace falta un período con la inscripción abierta hoy y uno ya terminado. Corré antes: pnpm db:seed:demo",
    );
  }

  console.log("Borrando datos de una corrida anterior...");
  await reset();

  console.log(`Creando carrera ${CAREER_CODE} y ${STUDENTS} alumnos...`);
  const career = await prisma.career.create({
    data: { careerName: "Carrera de prueba de carga", careerCode: CAREER_CODE, durationYears: 1 },
  });
  const plan = await prisma.studyPlan.create({ data: { careerId: career.careerId, resolution: "Plan carga" } });

  const sps: number[] = [];
  for (const s of SUBJECTS) {
    const subject = await prisma.subject.create({ data: { subjectCode: s.code, subjectName: s.name } });
    const row = await prisma.studyPlanSubject.create({
      data: {
        studyPlanId: plan.studyPlanId,
        subjectId: subject.subjectId,
        subjectYear: 1,
        semester: s.semester,
        weeklyHours: 4,
        totalHours: 64,
      },
    });
    sps.push(row.studyPlanSubjectId);
  }

  // --- Comisiones ---------------------------------------------------------------
  const offering = async (
    spsId: number,
    periodId: number,
    commission: string,
    status: string,
    capacity: number,
    slot?: [day: number, start: string, end: string],
  ) =>
    prisma.courseOffering.create({
      data: {
        studyPlanSubjectId: spsId,
        academicPeriodId: periodId,
        commission,
        capacity,
        offeringStatus: status,
        ...(slot
          ? {
              schedules: {
                create: [{ dayOfWeek: slot[0], startTime: timeFromString(slot[1]), endTime: timeFromString(slot[2]) }],
              },
            }
          : {}),
      },
    });

  // Historial: 3 cursadas cerradas del período anterior, con sus clases.
  const pastOfferings: { id: number; sessionIds: number[] }[] = [];
  for (const spsId of sps.slice(0, 3)) {
    const o = await offering(spsId, previous.academicPeriodId, "C1", OFFERING_STATUS.CERRADA, STUDENTS);
    const sessions = Array.from({ length: CLASSES_PER_OFFERING }, (_, k) => ({
      courseOfferingId: o.courseOfferingId,
      sessionDate: new Date(previous.periodStartDate.getTime() + k * 7 * 86_400_000),
      sessionTopic: `Clase ${k + 1}`,
    }));
    await prisma.classSession.createMany({ data: sessions });
    const sessionIds = (
      await prisma.classSession.findMany({ where: { courseOfferingId: o.courseOfferingId }, select: { classSessionId: true } })
    ).map((s) => s.classSessionId);
    pastOfferings.push({ id: o.courseOfferingId, sessionIds });
  }

  // En curso: 2 cursadas con horarios que no chocan con la comisión del pico.
  const currentOfferings = [
    await offering(sps[3]!, current.academicPeriodId, "C1", OFFERING_STATUS.ABIERTA, STUDENTS + 10, [1, "18:00", "22:00"]),
    await offering(sps[4]!, current.academicPeriodId, "C1", OFFERING_STATUS.ABIERTA, STUDENTS + 10, [3, "18:00", "22:00"]),
  ];
  // Pico de inscripción: todos los alumnos pueden anotarse, pero solo entran PEAK_CAPACITY.
  const peak = await offering(sps[5]!, current.academicPeriodId, "PICO", OFFERING_STATUS.ABIERTA, PEAK_CAPACITY, [
    5,
    "18:00",
    "22:00",
  ]);

  // --- Alumnos ------------------------------------------------------------------
  const passwordHash = bcrypt.hashSync(PASSWORD, 10);
  const indexes = Array.from({ length: STUDENTS }, (_, i) => i + 1);

  await inChunks(indexes, (chunk) =>
    prisma.user.createMany({
      data: chunk.map((i) => ({
        dni: String(DNI_BASE + i),
        role: "ALUMNO",
        firstName: "Alumno",
        lastName: `Carga ${i}`,
        email: `alumno${i}${EMAIL_DOMAIN}`,
        passwordHash,
      })),
    }),
  );
  const users = await prisma.user.findMany({ where: { email: { endsWith: EMAIL_DOMAIN } }, select: { userId: true, dni: true } });

  await inChunks(users, (chunk) =>
    prisma.studentProfile.createMany({
      data: chunk.map((u) => ({ userId: u.userId, legajo: `CG${Number(u.dni) - DNI_BASE}` })),
    }),
  );
  const profiles = await prisma.studentProfile.findMany({
    where: { user: { email: { endsWith: EMAIL_DOMAIN } } },
    select: { studentId: true },
  });

  await inChunks(profiles, (chunk) =>
    prisma.studentCareer.createMany({
      data: chunk.map((p) => ({
        studentId: p.studentId,
        careerId: career.careerId,
        admissionYear: previous.year,
        academicStatus: "ACTIVO",
      })),
    }),
  );
  const careers = await prisma.studentCareer.findMany({ where: { careerId: career.careerId }, select: { studentCareerId: true } });
  const careerIds = careers.map((c) => c.studentCareerId);

  await inChunks(careerIds, (chunk) =>
    prisma.studentStudyPlan.createMany({ data: chunk.map((id) => ({ studentCareerId: id, studyPlanId: plan.studyPlanId })) }),
  );

  // --- Inscripciones ------------------------------------------------------------
  console.log("Creando historial, cursadas en curso y asistencias...");
  // Variedad de condiciones para que el estado académico tenga algo que calcular.
  const pastStatus = [ENROLLMENT_STATUS.APROBADA, ENROLLMENT_STATUS.REGULAR, ENROLLMENT_STATUS.LIBRE];
  const enrollmentRows = careerIds.flatMap((studentCareerId, i) => [
    ...pastOfferings.map((o, k) => ({
      studentCareerId,
      courseOfferingId: o.id,
      enrollmentDate: previous.periodStartDate,
      enrollmentStatus: k === 2 ? pastStatus[i % 3]! : pastStatus[k]!,
    })),
    ...currentOfferings.map((o) => ({
      studentCareerId,
      courseOfferingId: o.courseOfferingId,
      enrollmentDate: today,
      enrollmentStatus: ENROLLMENT_STATUS.INSCRIPTO,
    })),
  ]);
  await inChunks(enrollmentRows, (chunk) => prisma.courseEnrollment.createMany({ data: chunk }));

  for (const o of pastOfferings) {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseOfferingId: o.id },
      select: { courseEnrollmentId: true },
    });
    const attendanceRows = enrollments.flatMap((e, i) =>
      o.sessionIds.map((classSessionId, k) => ({
        classSessionId,
        courseEnrollmentId: e.courseEnrollmentId,
        // ~1 falta cada 6 clases, desplazada por alumno.
        attendanceStatus: (i + k) % 6 === 0 ? ATTENDANCE_STATUS.AUSENTE : ATTENDANCE_STATUS.PRESENTE,
      })),
    );
    await inChunks(attendanceRows, (chunk) => prisma.attendance.createMany({ data: chunk }));
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`✔ Datos de carga listos en ${seconds} s:`);
  console.log(`  - ${STUDENTS} alumnos: DNI ${DNI_BASE + 1} a ${DNI_BASE + STUDENTS} / clave ${PASSWORD}`);
  console.log(`  - Historial en ${previous.year}-${previous.semester}: 3 cursadas con ${CLASSES_PER_OFFERING} clases cada una`);
  console.log(`  - Cursando en ${current.year}-${current.semester}: 2 comisiones`);
  console.log(`  - Comisión PICO (id ${peak.courseOfferingId}): cupo ${PEAK_CAPACITY}, todos los alumnos pueden anotarse`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
