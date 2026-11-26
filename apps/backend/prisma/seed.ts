import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { timeFromString } from "../src/lib/schedule.js";
import { CORRELATIVITY_TYPE, ENROLLMENT_STATUS, FINAL_EXAM_PASSING_GRADE, OFFERING_STATUS } from "../src/types/academic.js";

// ===========================================================================
// 1. Usuarios base (RF-01)
// ===========================================================================

async function seedUsers() {
  console.log("Verificando si existen usuarios en la base de datos...");

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`La base de datos ya cuenta con ${existingUsers} usuario(s). Omitiendo seed de usuarios.`);
    return;
  }

  console.log("Inicializando usuarios de prueba en SysA+...");

  const adminPasswordHash = bcrypt.hashSync("Admin123!", 10);
  const teacherPasswordHash = bcrypt.hashSync("Profesor123!", 10);
  const studentPasswordHash = bcrypt.hashSync("Alumno123!", 10);

  // 1. Administrador
  await prisma.user.create({
    data: {
      dni: "11111111",
      passwordHash: adminPasswordHash,
      role: "ADMINISTRADOR",
      firstName: "Admin",
      lastName: "SysA+",
      email: "admin@frgp.utn.edu.ar",
      administratorProfile: {
        create: {},
      },
    },
  });

  // 2. Profesor
  await prisma.user.create({
    data: {
      dni: "22222222",
      passwordHash: teacherPasswordHash,
      role: "PROFESOR",
      firstName: "Carlos",
      lastName: "Docente",
      email: "profesor@frgp.utn.edu.ar",
      teacherProfile: {
        create: {},
      },
    },
  });

  // 3. Alumno
  await prisma.user.create({
    data: {
      dni: "33333333",
      passwordHash: studentPasswordHash,
      role: "ALUMNO",
      firstName: "Lucía",
      lastName: "Fernández",
      email: "alumno@frgp.utn.edu.ar",
      studentProfile: {
        create: {
          legajo: "48215",
        },
      },
    },
  });

  console.log("✔ Usuarios iniciales creados exitosamente:");
  console.log("  - Administrador: DNI 11111111 / Clave: Admin123!");
  console.log("  - Profesor:      DNI 22222222 / Clave: Profesor123!");
  console.log("  - Alumno:        DNI 33333333 / Clave: Alumno123!");
}

// ===========================================================================
// 2. Datos académicos de prueba (RF-04)
//
// TODO(RF-02): carrera, plan, materias y correlatividades deberían cargarse desde
//   la pantalla de oferta académica del Administrador.
// TODO(RF-03): comisiones y docentes asignados deberían cargarse desde la
//   asignación de profesores.
// TODO(RF-07): el historial de la alumna (REGULAR / APROBADA) lo generaría la
//   carga de notas.
//
// Casos de prueba que deja armados para la alumna Lucía (DNI 33333333):
//   - Análisis Matemático II 2K1 / Sintaxis 2K1  → se superponen los martes.
//   - Física I 1K1                               → sin cupo.
//   - Física I 1K2                               → sin docente asignado ("A designar").
//   - Paradigmas de Programación                 → correlativa: Algoritmos APROBADA (ella la tiene regular).
//   - Física II                                  → correlativa: Física I regularizada (no la cursó).
//   - Análisis de Sistemas 2K1 (jueves 20 a 23)  → termina justo donde empieza AM II 2K1 (jueves 18 a 20): no choca.
// ===========================================================================

type Slot = [dayOfWeek: number, start: string, end: string];

const SUBJECTS = [
  { code: "AM1", name: "Análisis Matemático I", year: 1, semester: 1, weeklyHours: 5 },
  { code: "AGA", name: "Álgebra y Geometría Analítica", year: 1, semester: 1, weeklyHours: 5 },
  { code: "AYED", name: "Algoritmos y Estructuras de Datos", year: 1, semester: 1, weeklyHours: 5 },
  { code: "SYO", name: "Sistemas y Organizaciones", year: 1, semester: 1, weeklyHours: 3 },
  { code: "FIS1", name: "Física I", year: 1, semester: 2, weeklyHours: 5 },
  { code: "AM2", name: "Análisis Matemático II", year: 2, semester: 1, weeklyHours: 5 },
  { code: "SSL", name: "Sintaxis y Semántica de los Lenguajes", year: 2, semester: 1, weeklyHours: 4 },
  { code: "PPR", name: "Paradigmas de Programación", year: 2, semester: 1, weeklyHours: 4 },
  { code: "ADS", name: "Análisis de Sistemas", year: 2, semester: 1, weeklyHours: 6 },
  { code: "FIS2", name: "Física II", year: 2, semester: 2, weeklyHours: 5 },
] as const;

type SubjectCode = (typeof SUBJECTS)[number]["code"];

const CORRELATIVITIES: { target: SubjectCode; required: SubjectCode; type: string }[] = [
  { target: "AM2", required: "AM1", type: CORRELATIVITY_TYPE.REGULAR_TO_ENROLL },
  { target: "AM2", required: "AGA", type: CORRELATIVITY_TYPE.REGULAR_TO_ENROLL },
  { target: "AM2", required: "AM1", type: CORRELATIVITY_TYPE.APPROVED_FOR_EXAM },
  { target: "SSL", required: "AYED", type: CORRELATIVITY_TYPE.REGULAR_TO_ENROLL },
  { target: "PPR", required: "AYED", type: CORRELATIVITY_TYPE.APPROVED_TO_ENROLL },
  { target: "ADS", required: "SYO", type: CORRELATIVITY_TYPE.REGULAR_TO_ENROLL },
  { target: "ADS", required: "AYED", type: CORRELATIVITY_TYPE.REGULAR_TO_ENROLL },
  { target: "FIS2", required: "FIS1", type: CORRELATIVITY_TYPE.REGULAR_TO_ENROLL },
  { target: "FIS2", required: "AM1", type: CORRELATIVITY_TYPE.REGULAR_TO_ENROLL },
];

/** Comisiones del período con inscripción abierta. teacher: DNI del docente, o null = sin asignar. */
const CURRENT_OFFERINGS: {
  subject: SubjectCode;
  commission: string;
  capacity: number;
  teacher: string | null;
  slots: Slot[];
}[] = [
  { subject: "FIS1", commission: "1K1", capacity: 2, teacher: "22222222", slots: [[3, "18:00", "22:00"]] },
  { subject: "FIS1", commission: "1K2", capacity: 35, teacher: null, slots: [[5, "18:00", "22:00"]] },
  { subject: "AM2", commission: "2K1", capacity: 35, teacher: "22222222", slots: [[2, "18:00", "22:00"], [4, "18:00", "20:00"]] },
  { subject: "AM2", commission: "2K2", capacity: 35, teacher: "22222222", slots: [[6, "08:00", "12:00"]] },
  { subject: "SSL", commission: "2K1", capacity: 35, teacher: "22222223", slots: [[2, "19:00", "23:00"]] },
  { subject: "SSL", commission: "2K2", capacity: 35, teacher: "22222223", slots: [[1, "18:00", "22:00"]] },
  { subject: "PPR", commission: "2K1", capacity: 35, teacher: "22222223", slots: [[3, "18:00", "22:00"]] },
  { subject: "ADS", commission: "2K1", capacity: 35, teacher: "22222223", slots: [[4, "20:00", "23:00"]] },
  { subject: "FIS2", commission: "2K1", capacity: 35, teacher: "22222222", slots: [[5, "08:00", "12:00"]] },
];

/** Historial de Lucía en un período anterior. */
const STUDENT_HISTORY: { subject: SubjectCode; status: string }[] = [
  { subject: "AM1", status: ENROLLMENT_STATUS.REGULAR },
  { subject: "AGA", status: ENROLLMENT_STATUS.REGULAR },
  { subject: "AYED", status: ENROLLMENT_STATUS.REGULAR },
  { subject: "SYO", status: ENROLLMENT_STATUS.APROBADA }, // promoción
];

/** Finales de Lucía en la mesa de diciembre del período anterior (RF-09: materias rendidas). */
const STUDENT_FINALS: { subject: SubjectCode; grade: number }[] = [
  { subject: "AGA", grade: 8 }, // aprobada por final
  { subject: "AM1", grade: 4 }, // desaprobado: sigue regular
];

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60_000);
}

function semesterDates(year: number, semester: number) {
  return semester === 1
    ? { periodStartDate: utcDate(year, 3, 16), periodEndDate: utcDate(year, 7, 10) }
    : { periodStartDate: utcDate(year, 8, 10), periodEndDate: utcDate(year, 12, 5) };
}

async function ensureUser(data: {
  dni: string;
  role: "ALUMNO" | "PROFESOR";
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  legajo?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { dni: data.dni } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      dni: data.dni,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: bcrypt.hashSync(data.password, 10),
      ...(data.role === "PROFESOR"
        ? { teacherProfile: { create: {} } }
        : { studentProfile: { create: { legajo: data.legajo! } } }),
    },
  });
}

async function seedAcademicData() {
  const existingCareers = await prisma.career.count();
  if (existingCareers > 0) {
    console.log("Ya existen carreras cargadas. Omitiendo seed académico.");
    return;
  }

  console.log("Inicializando datos académicos de prueba (RF-04)...");

  // --- Usuarios adicionales -------------------------------------------------
  await ensureUser({
    dni: "22222223",
    role: "PROFESOR",
    firstName: "Laura",
    lastName: "Díaz",
    email: "laura.diaz@frgp.utn.edu.ar",
    password: "Profesor123!",
  });
  // Alumnos que ocupan el cupo de Física I 1K1.
  await ensureUser({
    dni: "44444444",
    role: "ALUMNO",
    firstName: "Martín",
    lastName: "Gómez",
    email: "martin.gomez@frgp.utn.edu.ar",
    password: "Alumno123!",
    legajo: "48300",
  });
  await ensureUser({
    dni: "55555555",
    role: "ALUMNO",
    firstName: "Sofía",
    lastName: "Ruiz",
    email: "sofia.ruiz@frgp.utn.edu.ar",
    password: "Alumno123!",
    legajo: "48301",
  });

  // --- Períodos -------------------------------------------------------------
  // El período "actual" es el próximo cuatrimestre, con la inscripción abierta desde
  // hace una semana y por 60 días, para que el seed sirva sin importar la fecha.
  const now = new Date();
  const today = utcDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const current =
    now.getMonth() < 5 ? { year: now.getFullYear(), semester: 2 } : { year: now.getFullYear() + 1, semester: 1 };
  // Siempre el 2° cuatrimestre del año pasado: tiene que estar terminado para que el historial
  // cuente como cursadas cerradas (RF-09). current.year - 1 caía en el cuatrimestre en curso entre junio y diciembre.
  const previous = { year: now.getFullYear() - 1, semester: 2 };

  const previousPeriod = await prisma.academicPeriod.create({
    data: { ...previous, ...semesterDates(previous.year, previous.semester) },
  });
  const currentPeriod = await prisma.academicPeriod.create({
    data: {
      ...current,
      ...semesterDates(current.year, current.semester),
      enrollmentStartDate: addDays(today, -7),
      enrollmentEndDate: addDays(today, 60),
    },
  });

  // --- Carrera, plan y materias ---------------------------------------------
  const career = await prisma.career.create({
    data: {
      careerName: "Ingeniería en Sistemas de Información",
      careerCode: "ISI",
      durationYears: 5,
      careerDescription: "Carrera de grado de la UTN - Facultad Regional General Pacheco",
    },
  });
  const studyPlan = await prisma.studyPlan.create({
    data: { careerId: career.careerId, resolution: "Plan 2023" },
  });

  const spsByCode = new Map<SubjectCode, number>();
  for (const s of SUBJECTS) {
    const subject = await prisma.subject.create({
      data: { subjectCode: s.code, subjectName: s.name },
    });
    const sps = await prisma.studyPlanSubject.create({
      data: {
        studyPlanId: studyPlan.studyPlanId,
        subjectId: subject.subjectId,
        subjectYear: s.year,
        semester: s.semester,
        weeklyHours: s.weeklyHours,
        totalHours: s.weeklyHours * 16,
      },
    });
    spsByCode.set(s.code, sps.studyPlanSubjectId);
  }

  for (const c of CORRELATIVITIES) {
    await prisma.subjectCorrelativity.create({
      data: {
        targetSubjectId: spsByCode.get(c.target)!,
        requiredSubjectId: spsByCode.get(c.required)!,
        correlativityType: c.type,
      },
    });
  }

  // --- Alumnos en la carrera ------------------------------------------------
  async function enrollInCareer(dni: string) {
    const student = await prisma.studentProfile.findFirstOrThrow({ where: { user: { dni } } });
    const studentCareer = await prisma.studentCareer.create({
      data: {
        studentId: student.studentId,
        careerId: career.careerId,
        admissionYear: previous.year,
        academicStatus: "ACTIVO",
      },
    });
    await prisma.studentStudyPlan.create({
      data: { studentCareerId: studentCareer.studentCareerId, studyPlanId: studyPlan.studyPlanId },
    });
    return studentCareer.studentCareerId;
  }

  const luciaCareerId = await enrollInCareer("33333333");
  const fillerCareerIds = [await enrollInCareer("44444444"), await enrollInCareer("55555555")];

  // --- Historial de Lucía (período anterior) --------------------------------
  for (const h of STUDENT_HISTORY) {
    const offering = await prisma.courseOffering.create({
      data: {
        studyPlanSubjectId: spsByCode.get(h.subject)!,
        academicPeriodId: previousPeriod.academicPeriodId,
        commission: "1K1",
        capacity: 40,
        offeringStatus: OFFERING_STATUS.CERRADA,
      },
    });
    await prisma.courseEnrollment.create({
      data: {
        studentCareerId: luciaCareerId,
        courseOfferingId: offering.courseOfferingId,
        enrollmentDate: semesterDates(previous.year, previous.semester).periodStartDate,
        enrollmentStatus: h.status,
      },
    });
  }

  // --- Finales de Lucía (mesa de diciembre del período anterior) -------------
  const examDate = utcDate(previous.year, 12, 15);
  const examSession = await prisma.examSession.create({
    data: {
      examName: `Mesa de diciembre ${previous.year}`,
      examYear: previous.year,
      sessionStartDate: utcDate(previous.year, 12, 9),
      sessionEndDate: utcDate(previous.year, 12, 20),
      sessionStatus: "CERRADA",
    },
  });
  const luciaPlan = await prisma.studentStudyPlan.findFirstOrThrow({ where: { studentCareerId: luciaCareerId } });
  for (const f of STUDENT_FINALS) {
    const call = await prisma.examCall.create({
      data: {
        studyPlanSubjectId: spsByCode.get(f.subject)!,
        examSessionId: examSession.examSessionId,
        callDate: examDate,
        callStatus: "CERRADA",
      },
    });
    await prisma.examEnrollment.create({
      data: {
        examCallId: call.examCallId,
        studentCareerId: luciaCareerId,
        studentStudyPlanId: luciaPlan.studentStudyPlanId,
        examStatus: f.grade >= FINAL_EXAM_PASSING_GRADE ? "APROBADO" : "DESAPROBADO",
        examGrade: f.grade,
      },
    });
  }

  // --- Comisiones del período actual ----------------------------------------
  const teacherIdByDni = new Map<string, number>();
  for (const dni of ["22222222", "22222223"]) {
    const teacher = await prisma.teacherProfile.findFirstOrThrow({ where: { user: { dni } } });
    teacherIdByDni.set(dni, teacher.teacherId);
  }

  for (const o of CURRENT_OFFERINGS) {
    const offering = await prisma.courseOffering.create({
      data: {
        studyPlanSubjectId: spsByCode.get(o.subject)!,
        academicPeriodId: currentPeriod.academicPeriodId,
        commission: o.commission,
        capacity: o.capacity,
        offeringStatus: OFFERING_STATUS.ABIERTA,
        schedules: {
          create: o.slots.map(([dayOfWeek, start, end]) => ({
            dayOfWeek,
            startTime: timeFromString(start),
            endTime: timeFromString(end),
          })),
        },
        ...(o.teacher ? { teacherAssignments: { create: { teacherId: teacherIdByDni.get(o.teacher)! } } } : {}),
      },
    });

    // Física I 1K1 queda sin cupo.
    if (o.subject === "FIS1" && o.commission === "1K1") {
      for (const studentCareerId of fillerCareerIds) {
        await prisma.courseEnrollment.create({
          data: {
            studentCareerId,
            courseOfferingId: offering.courseOfferingId,
            enrollmentDate: today,
            enrollmentStatus: ENROLLMENT_STATUS.INSCRIPTO,
          },
        });
      }
    }
  }

  console.log("✔ Datos académicos creados:");
  console.log(`  - Carrera ISI (Plan 2023) con ${SUBJECTS.length} materias y ${CORRELATIVITIES.length} correlatividades`);
  console.log(
    `  - Inscripción abierta para el ${current.semester}° cuatrimestre ${current.year} ` +
      `(${addDays(today, -7).toISOString().slice(0, 10)} al ${addDays(today, 60).toISOString().slice(0, 10)})`,
  );
  console.log("  - Profesora adicional: DNI 22222223 / Clave: Profesor123!");
  console.log("  - Alumnos adicionales: DNI 44444444 y 55555555 / Clave: Alumno123!");
}

async function main() {
  await seedUsers();
  await seedAcademicData();
}

main()
  .catch((e) => {
    console.error("Error al ejecutar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
