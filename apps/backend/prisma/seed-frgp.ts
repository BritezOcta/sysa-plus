/**
 * Seed con datos reales de UTN FRGP (planes, correlatividades y grillas horarias 2026).
 * Uso: pnpm --filter backend db:seed:frgp
 *
 * - Idempotente: una carrera cuyo código ya existe se saltea completa.
 * - Docentes: las grillas solo publican apellidos, así que cada uno se crea como usuario
 *   PROFESOR de prueba (DNI 90xxxxxx, email @docentes.sysa.test, clave Docente123!).
 *   El primero de cada materia queda TITULAR y el resto AYUDANTE.
 */
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma.js";
import { timeFromString } from "../src/lib/schedule.js";
import { ASSIGNMENT_ROLE, OFFERING_STATUS } from "../src/types/academic.js";
import { LOI } from "./data/frgp/loi.js";
import { MECANICA } from "./data/frgp/mecanica.js";
import { TUP } from "./data/frgp/tup.js";
import type { SeedCareer, SeedSubject } from "./data/frgp/types.js";

const CAREERS: SeedCareer[] = [TUP, MECANICA, LOI];

const SEED_YEAR = 2026;
const DEFAULT_CAPACITY = 40;
const TEACHER_PASSWORD = "Docente123!";
const TEACHER_EMAIL_DOMAIN = "docentes.sysa.test";
const TEACHER_DNI_BASE = 90_000_000;

/** Calendario 2026 de FRGP: comienzo de clases 16/03 y 10/08; inscripción web la semana previa. */
const PERIODS = {
  1: { start: "2026-03-16", end: "2026-07-11", enrollStart: "2026-03-09", enrollEnd: "2026-03-14" },
  2: { start: "2026-08-10", end: "2026-12-05", enrollStart: "2026-08-03", enrollEnd: "2026-08-07" },
} as const;

const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function subjectCode(career: SeedCareer, key: string): string {
  return `${career.subjectPrefix}-${/^\d+$/.test(key) ? key.padStart(2, "0") : key}`;
}

function totalHours(subject: SeedSubject): number {
  return subject.totalHours ?? subject.weeklyHours * (subject.period === 0 ? 32 : 16);
}

/** "T. Herrera" → { firstName: "T.", lastName: "Herrera" }; "Fernandez JM" → { "JM", "Fernandez" }. */
function splitTeacherName(raw: string): { firstName: string; lastName: string } {
  const name = raw.trim();
  const initial = name.match(/^([A-ZÁÉÍÓÚÑ]\.)\s*(.+)$/);
  if (initial) return { firstName: initial[1]!, lastName: initial[2]! };
  const trailing = name.match(/^(.+?)\s+([A-Z]{1,3})$/);
  if (trailing) return { firstName: trailing[2]!, lastName: trailing[1]! };
  return { firstName: "Docente", lastName: name };
}

/** Clave para no duplicar docentes por tildes o mayúsculas ("Simón" = "Simon"). */
function teacherKey(raw: string): string {
  return raw.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "").toLowerCase();
}

async function ensurePeriods() {
  const ids = new Map<1 | 2, number>();
  for (const semester of [1, 2] as const) {
    const cfg = PERIODS[semester];
    const period = await prisma.academicPeriod.upsert({
      where: { year_semester: { year: SEED_YEAR, semester } },
      update: {},
      create: {
        year: SEED_YEAR,
        semester,
        periodStartDate: date(cfg.start),
        periodEndDate: date(cfg.end),
        enrollmentStartDate: date(cfg.enrollStart),
        enrollmentEndDate: date(cfg.enrollEnd),
      },
    });
    ids.set(semester, period.academicPeriodId);
  }
  return ids;
}

function createTeacherResolver() {
  const cache = new Map<string, number>();
  const passwordHash = bcrypt.hashSync(TEACHER_PASSWORD, 10);
  let created = 0;

  return {
    get created() {
      return created;
    },
    async resolve(raw: string): Promise<number> {
      const key = teacherKey(raw);
      const cached = cache.get(key);
      if (cached) return cached;

      const email = `${key}@${TEACHER_EMAIL_DOMAIN}`;
      const existing = await prisma.user.findUnique({ where: { email }, include: { teacherProfile: true } });
      if (existing?.teacherProfile) {
        cache.set(key, existing.teacherProfile.teacherId);
        return existing.teacherProfile.teacherId;
      }

      const lastDni = await prisma.user.findFirst({
        where: { dni: { startsWith: "9" }, email: { endsWith: `@${TEACHER_EMAIL_DOMAIN}` } },
        orderBy: { dni: "desc" },
        select: { dni: true },
      });
      const dni = String(lastDni ? Number(lastDni.dni) + 1 : TEACHER_DNI_BASE + 1);
      const { firstName, lastName } = splitTeacherName(raw);
      const user = await prisma.user.create({
        data: { dni, email, passwordHash, role: "PROFESOR", firstName, lastName, teacherProfile: { create: {} } },
        include: { teacherProfile: true },
      });
      created++;
      cache.set(key, user.teacherProfile!.teacherId);
      return user.teacherProfile!.teacherId;
    },
  };
}

async function seedCareer(
  career: SeedCareer,
  periodIds: Map<1 | 2, number>,
  teachers: ReturnType<typeof createTeacherResolver>,
) {
  if (await prisma.career.findUnique({ where: { careerCode: career.code } })) {
    console.log(`- ${career.code}: ya existe, se omite.`);
    return;
  }

  const created = await prisma.career.create({
    data: {
      careerCode: career.code,
      careerName: career.name,
      durationYears: career.durationYears,
      careerDescription: career.description,
      studyPlans: { create: { resolution: career.studyPlan, isActive: true } },
    },
    include: { studyPlans: true },
  });
  const planId = created.studyPlans[0]!.studyPlanId;

  const spsByKey = new Map<string, number>();
  for (const s of career.subjects) {
    const code = subjectCode(career, s.key);
    const subject = await prisma.subject.upsert({
      where: { subjectCode: code },
      update: { subjectName: s.name },
      create: { subjectCode: code, subjectName: s.name },
    });
    const sps = await prisma.studyPlanSubject.create({
      data: {
        studyPlanId: planId,
        subjectId: subject.subjectId,
        subjectYear: s.year,
        semester: s.period,
        weeklyHours: s.weeklyHours,
        totalHours: totalHours(s),
      },
    });
    spsByKey.set(s.key, sps.studyPlanSubjectId);
  }

  const sps = (key: string) => {
    const id = spsByKey.get(key);
    if (!id) throw new Error(`${career.code}: la materia "${key}" no está en el plan`);
    return id;
  };

  let correlativities = 0;
  for (const c of career.correlativities) {
    const reqs = [
      ...(c.regular ?? []).map((k) => ({ key: k, type: "regularizada_cursar" })),
      ...(c.approved ?? []).map((k) => ({ key: k, type: "aprobada_cursar" })),
    ];
    for (const r of reqs) {
      await prisma.subjectCorrelativity.create({
        data: { targetSubjectId: sps(c.target), requiredSubjectId: sps(r.key), correlativityType: r.type },
      });
      correlativities++;
    }
  }

  let assignments = 0;
  for (const o of career.offerings) {
    const offering = await prisma.courseOffering.create({
      data: {
        studyPlanSubjectId: sps(o.subject),
        academicPeriodId: periodIds.get(o.semester)!,
        commission: o.commission,
        capacity: DEFAULT_CAPACITY,
        offeringStatus: OFFERING_STATUS.ABIERTA,
        schedules: {
          create: o.slots.map((s) => ({
            dayOfWeek: s.day,
            startTime: timeFromString(s.start),
            endTime: timeFromString(s.end),
          })),
        },
      },
    });

    const seen = new Set<number>();
    for (const [index, name] of o.teachers.entries()) {
      const teacherId = await teachers.resolve(name);
      if (seen.has(teacherId)) continue;
      seen.add(teacherId);
      await prisma.teacherAssignment.create({
        data: {
          teacherId,
          courseOfferingId: offering.courseOfferingId,
          assignmentRole: index === 0 ? ASSIGNMENT_ROLE.TITULAR : ASSIGNMENT_ROLE.AYUDANTE,
        },
      });
      assignments++;
    }
  }

  console.log(
    `✔ ${career.code}: ${career.subjects.length} materias, ${correlativities} correlatividades, ` +
      `${career.offerings.length} comisiones, ${assignments} asignaciones docentes.`,
  );
}

async function main() {
  console.log("Cargando datos de UTN FRGP...");
  const periodIds = await ensurePeriods();
  const teachers = createTeacherResolver();
  for (const career of CAREERS) {
    await seedCareer(career, periodIds, teachers);
  }
  console.log(`✔ Docentes de prueba creados: ${teachers.created} (clave ${TEACHER_PASSWORD}).`);
}

main()
  .catch((error) => {
    console.error("Error en seed FRGP:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
