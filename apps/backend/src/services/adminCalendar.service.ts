import { AppError } from "../lib/AppError.js";
import { prisma } from "../lib/prisma.js";
import { formatScheduleText, timeFromString, toScheduleDtos } from "../lib/schedule.js";
import { ENROLLMENT_STATUS, EXAM_CALL_STATUS, EXAM_STATUS, OFFERING_STATUS } from "../types/academic.js";
import { ROLES } from "../types/auth.js";
import { auditService } from "./audit.service.js";

/**
 * Administrador/Director: ventanas de inscripción y oferta de cada período.
 * - Cuatrimestres (ACADEMIC_PERIOD): fechas de cursada + ventana de inscripción a cursadas (RF-04).
 * - Comisiones (COURSE_OFFERING + COURSE_SCHEDULE): código, cupo, estado y horarios.
 * - Turnos de examen (EXAM_SESSION): fechas + ventana de inscripción a mesas (RF-06).
 * - Mesas (EXAM_CALL): materia, fecha y hora, aula, cupo y docente a cargo.
 */

export interface Actor {
  userId: number;
  ipAddress: string | null;
}

type Body = Record<string, unknown>;

const AUDIT = {
  PERIOD: "CALENDAR_PERIOD_SAVED",
  COMMISSION_CREATED: "COMMISSION_CREATED",
  COMMISSION_UPDATED: "COMMISSION_UPDATED",
  COMMISSION_DELETED: "COMMISSION_DELETED",
  SESSION: "EXAM_SESSION_SAVED",
  CALL_CREATED: "EXAM_CALL_CREATED",
  CALL_UPDATED: "EXAM_CALL_UPDATED",
  CALL_DELETED: "EXAM_CALL_DELETED",
} as const;

const EDITABLE_OFFERING_STATUS = [OFFERING_STATUS.ABIERTA, OFFERING_STATUS.CERRADA, OFFERING_STATUS.CANCELADA] as const;
const CALL_STATUSES = [EXAM_CALL_STATUS.ABIERTA, EXAM_CALL_STATUS.CERRADA] as const;
const MAX_CAPACITY = 1000;

// ---------------------------------------------------------------------------
// Validación y formato
// ---------------------------------------------------------------------------

const invalid = (message: string, details?: Record<string, unknown>) => new AppError(400, "VALIDATION_ERROR", message, details);

function parseId(raw: unknown, label: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw invalid(`El identificador de ${label} no es válido`);
  return id;
}

/** "2026-08-10" → Date (UTC) para columnas DATE. */
function parseDate(raw: unknown, label: string): Date {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw invalid(`${label}: indicá una fecha válida (AAAA-MM-DD)`);
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) throw invalid(`${label}: la fecha no existe`);
  return date;
}

function parseTime(raw: unknown, label: string): string {
  if (typeof raw !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) throw invalid(`${label}: indicá una hora válida (HH:MM)`);
  return raw;
}

function parseInt_(raw: unknown, label: string, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw invalid(`${label} debe ser un número entero entre ${min} y ${max}`);
  return n;
}

function parseText(raw: unknown, label: string, max: number, required = true): string | null {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) {
    if (required) throw invalid(`${label} es obligatorio`);
    return null;
  }
  if (text.length > max) throw invalid(`${label} admite hasta ${max} caracteres`);
  return text;
}

function oneOf<T extends string>(raw: unknown, allowed: readonly T[], label: string): T {
  if (typeof raw === "string" && (allowed as readonly string[]).includes(raw)) return raw as T;
  throw invalid(`${label} no es válido`, { allowed });
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const hhmm = (d: Date) => `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const today = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

type WindowStatus = "ABIERTA" | "PROXIMA" | "CERRADA" | "SIN_DEFINIR";
function windowStatus(start: Date | null, end: Date | null): WindowStatus {
  if (!start || !end) return "SIN_DEFINIR";
  const t = today();
  if (t < start) return "PROXIMA";
  return t > end ? "CERRADA" : "ABIERTA";
}

/** Fechas del período/turno y su ventana de inscripción (la ventana no puede terminar después del período). */
function parseRange(body: Body, labels: { start: string; end: string }) {
  const startDate = parseDate(body["startDate"], labels.start);
  const endDate = parseDate(body["endDate"], labels.end);
  if (endDate <= startDate) throw invalid(`${labels.end} debe ser posterior a ${labels.start.toLowerCase()}`);
  const enrollmentStartDate = parseDate(body["enrollmentStartDate"], "Inicio de inscripción");
  const enrollmentEndDate = parseDate(body["enrollmentEndDate"], "Cierre de inscripción");
  if (enrollmentEndDate < enrollmentStartDate) throw invalid("El cierre de la inscripción no puede ser anterior a su inicio");
  if (enrollmentEndDate > endDate) throw invalid(`La inscripción debe cerrar antes de ${labels.end.toLowerCase()}`);
  return { startDate, endDate, enrollmentStartDate, enrollmentEndDate };
}

interface SlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

function parseSchedule(raw: unknown): SlotInput[] {
  if (!Array.isArray(raw)) throw invalid("Indicá los horarios de la comisión");
  const slots = raw.map((item, i) => {
    const s = (item ?? {}) as Body;
    const label = `Horario ${i + 1}`;
    const slot = {
      dayOfWeek: parseInt_(s["dayOfWeek"], `${label} · día`, 1, 7),
      startTime: parseTime(s["startTime"], `${label} · inicio`),
      endTime: parseTime(s["endTime"], `${label} · fin`),
    };
    if (minutes(slot.endTime) <= minutes(slot.startTime)) throw invalid(`${label}: la hora de fin debe ser posterior a la de inicio`);
    return slot;
  });
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]!;
      const b = slots[j]!;
      if (a.dayOfWeek === b.dayOfWeek && minutes(a.startTime) < minutes(b.endTime) && minutes(b.startTime) < minutes(a.endTime)) {
        throw invalid("Hay horarios de la comisión que se superponen en el mismo día");
      }
    }
  }
  return slots;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

const periodLabel = (p: { year: number; semester: number }) => `${p.semester}° cuatrimestre ${p.year}`;

async function audit(actor: Actor, action: string, entity: string, entityId: number | string, details: string) {
  await auditService.record({ userId: actor.userId, action, entity, entityId: String(entityId), details, ipAddress: actor.ipAddress });
}

// ---------------------------------------------------------------------------
// Servicio
// ---------------------------------------------------------------------------

export const adminCalendarService = {
  async getOptions() {
    const [careers, teachers] = await Promise.all([
      prisma.career.findMany({ select: { careerId: true, careerCode: true, careerName: true, isActive: true }, orderBy: [{ isActive: "desc" }, { careerName: "asc" }] }),
      prisma.teacherProfile.findMany({
        where: { user: { isActive: true, role: ROLES.PROFESOR } },
        select: { teacherId: true, user: { select: { firstName: true, lastName: true } } },
        orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
      }),
    ]);
    return {
      careers: careers.map((c) => ({ id: String(c.careerId), code: c.careerCode, name: c.careerName, isActive: c.isActive })),
      teachers: teachers.map((t) => ({ id: String(t.teacherId), fullName: `${t.user.lastName}, ${t.user.firstName}` })),
    };
  },

  async getCareerSubjects(rawCareerId: unknown) {
    const careerId = parseId(rawCareerId, "carrera");
    const subjects = await prisma.studyPlanSubject.findMany({
      where: { studyPlan: { careerId, isActive: true }, isActive: true },
      select: { studyPlanSubjectId: true, subjectYear: true, semester: true, subject: { select: { subjectCode: true, subjectName: true } } },
      orderBy: [{ subjectYear: "asc" }, { semester: "asc" }, { subject: { subjectName: "asc" } }],
    });
    return {
      subjects: subjects.map((s) => ({
        id: String(s.studyPlanSubjectId),
        code: s.subject.subjectCode,
        name: s.subject.subjectName,
        year: s.subjectYear,
        semester: s.semester,
      })),
    };
  },

  // ---- Cuatrimestres ----

  async listPeriods() {
    const periods = await prisma.academicPeriod.findMany({
      orderBy: [{ year: "desc" }, { semester: "desc" }],
      include: { _count: { select: { courseOfferings: true } } },
    });
    return {
      periods: periods.map((p) => ({
        id: String(p.academicPeriodId),
        year: p.year,
        semester: p.semester,
        label: periodLabel(p),
        startDate: iso(p.periodStartDate),
        endDate: iso(p.periodEndDate),
        enrollmentStartDate: iso(p.enrollmentStartDate),
        enrollmentEndDate: iso(p.enrollmentEndDate),
        windowStatus: windowStatus(p.enrollmentStartDate, p.enrollmentEndDate),
        commissionsCount: p._count.courseOfferings,
      })),
    };
  },

  async savePeriod(rawId: unknown, body: Body, actor: Actor) {
    const id = rawId === undefined ? null : parseId(rawId, "período");
    const range = parseRange(body, { start: "Inicio de cursada", end: "Fin de cursada" });
    const data = {
      periodStartDate: range.startDate,
      periodEndDate: range.endDate,
      enrollmentStartDate: range.enrollmentStartDate,
      enrollmentEndDate: range.enrollmentEndDate,
    };

    let saved;
    if (id) {
      if (!(await prisma.academicPeriod.findUnique({ where: { academicPeriodId: id } }))) {
        throw new AppError(404, "PERIOD_NOT_FOUND", "El cuatrimestre indicado no existe");
      }
      saved = await prisma.academicPeriod.update({ where: { academicPeriodId: id }, data });
    } else {
      const year = parseInt_(body["year"], "El año", 2000, 2100);
      const semester = parseInt_(body["semester"], "El cuatrimestre", 1, 2);
      try {
        saved = await prisma.academicPeriod.create({ data: { year, semester, ...data } });
      } catch (err) {
        if (isUniqueViolation(err)) throw new AppError(409, "DUPLICATE_PERIOD", `Ya existe el ${semester}° cuatrimestre ${year}`);
        throw err;
      }
    }

    await audit(actor, AUDIT.PERIOD, "PERIODO", saved.academicPeriodId,
      `${id ? "Editó" : "Creó"} ${periodLabel(saved)}: cursada ${iso(saved.periodStartDate)} a ${iso(saved.periodEndDate)}, inscripción ${iso(saved.enrollmentStartDate)} a ${iso(saved.enrollmentEndDate)}`);
    return { id: String(saved.academicPeriodId) };
  },

  // ---- Comisiones ----

  /** Comisiones de una carrera en un período, con ocupación y horarios. */
  async listCommissions(rawPeriodId: unknown, rawCareerId: unknown) {
    const periodId = parseId(rawPeriodId, "período");
    const careerId = parseId(rawCareerId, "carrera");
    const offerings = await prisma.courseOffering.findMany({
      where: { academicPeriodId: periodId, studyPlanSubject: { studyPlan: { careerId, isActive: true } } },
      include: {
        schedules: true,
        studyPlanSubject: { select: { studyPlanSubjectId: true, subjectYear: true, semester: true, subject: { select: { subjectCode: true, subjectName: true } } } },
        _count: { select: { courseEnrollments: { where: { enrollmentStatus: { not: ENROLLMENT_STATUS.CANCELADA } } } } },
      },
      orderBy: [{ studyPlanSubject: { subjectYear: "asc" } }, { commission: "asc" }],
    });
    return {
      commissions: offerings.map((o) => ({
        id: String(o.courseOfferingId),
        subjectId: String(o.studyPlanSubject.studyPlanSubjectId),
        subjectCode: o.studyPlanSubject.subject.subjectCode,
        subjectName: o.studyPlanSubject.subject.subjectName,
        year: o.studyPlanSubject.subjectYear,
        semester: o.studyPlanSubject.semester,
        code: o.commission,
        capacity: o.capacity,
        enrolled: o._count.courseEnrollments,
        isFull: o._count.courseEnrollments >= o.capacity,
        status: o.offeringStatus,
        schedule: toScheduleDtos(o.schedules),
        scheduleText: formatScheduleText(o.schedules),
      })),
    };
  },

  async createCommission(body: Body, actor: Actor) {
    const studyPlanSubjectId = parseId(body["subjectId"], "materia");
    const academicPeriodId = parseId(body["periodId"], "período");
    const code = parseText(body["code"], "El código de comisión", 20)!.toUpperCase();
    const capacity = parseInt_(body["capacity"], "El cupo", 1, MAX_CAPACITY);
    const status = body["status"] === undefined ? OFFERING_STATUS.ABIERTA : oneOf(body["status"], EDITABLE_OFFERING_STATUS, "El estado");
    const schedule = parseSchedule(body["schedule"]);

    const [subject, period] = await Promise.all([
      prisma.studyPlanSubject.findUnique({ where: { studyPlanSubjectId }, include: { subject: true } }),
      prisma.academicPeriod.findUnique({ where: { academicPeriodId } }),
    ]);
    if (!subject) throw new AppError(404, "SUBJECT_NOT_FOUND", "La materia indicada no existe");
    if (!period) throw new AppError(404, "PERIOD_NOT_FOUND", "El cuatrimestre indicado no existe");

    let created;
    try {
      created = await prisma.courseOffering.create({
        data: {
          studyPlanSubjectId,
          academicPeriodId,
          commission: code,
          capacity,
          offeringStatus: status,
          schedules: { create: schedule.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: timeFromString(s.startTime), endTime: timeFromString(s.endTime) })) },
        },
        include: { schedules: true },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError(409, "DUPLICATE_COMMISSION", `${subject.subject.subjectName} ya tiene una comisión ${code} en el ${periodLabel(period)}`);
      }
      throw err;
    }

    await audit(actor, AUDIT.COMMISSION_CREATED, "COMISION", created.courseOfferingId,
      `Creó la comisión ${code} de ${subject.subject.subjectCode} - ${subject.subject.subjectName} (${periodLabel(period)}), cupo ${capacity}, ${formatScheduleText(created.schedules)}`);
    return { id: String(created.courseOfferingId) };
  },

  async updateCommission(rawId: unknown, body: Body, actor: Actor) {
    const id = parseId(rawId, "comisión");
    const code = parseText(body["code"], "El código de comisión", 20)!.toUpperCase();
    const capacity = parseInt_(body["capacity"], "El cupo", 1, MAX_CAPACITY);
    const status = oneOf(body["status"], EDITABLE_OFFERING_STATUS, "El estado");
    const schedule = parseSchedule(body["schedule"]);

    const offering = await prisma.courseOffering.findUnique({
      where: { courseOfferingId: id },
      include: {
        academicPeriod: true,
        studyPlanSubject: { include: { subject: true } },
        _count: { select: { courseEnrollments: { where: { enrollmentStatus: { not: ENROLLMENT_STATUS.CANCELADA } } } } },
      },
    });
    if (!offering) throw new AppError(404, "COMMISSION_NOT_FOUND", "La comisión indicada no existe");
    const enrolled = offering._count.courseEnrollments;
    if (capacity < enrolled) {
      throw new AppError(409, "CAPACITY_BELOW_ENROLLED", `La comisión ya tiene ${enrolled} inscriptos: el cupo no puede ser menor.`);
    }
    if (status === OFFERING_STATUS.CANCELADA && enrolled > 0) {
      throw new AppError(409, "COMMISSION_HAS_ENROLLMENTS", `No se puede cancelar: la comisión tiene ${enrolled} inscriptos. Cerrala para que no reciba nuevas inscripciones.`);
    }

    try {
      await prisma.$transaction([
        prisma.courseSchedule.deleteMany({ where: { courseOfferingId: id } }),
        prisma.courseOffering.update({
          where: { courseOfferingId: id },
          data: {
            commission: code,
            capacity,
            offeringStatus: status,
            schedules: { create: schedule.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: timeFromString(s.startTime), endTime: timeFromString(s.endTime) })) },
          },
        }),
      ]);
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppError(409, "DUPLICATE_COMMISSION", `Ya existe otra comisión ${code} de esa materia en el período`);
      throw err;
    }

    await audit(actor, AUDIT.COMMISSION_UPDATED, "COMISION", id,
      `Editó la comisión ${code} de ${offering.studyPlanSubject.subject.subjectCode} (${periodLabel(offering.academicPeriod)}): cupo ${capacity}, estado ${status}, ${schedule.length} franja(s) horaria(s)`);
    return { id: String(id) };
  },

  /** Solo se borra una comisión sin actividad; si ya tuvo inscriptos o clases, se cierra o cancela. */
  async deleteCommission(rawId: unknown, actor: Actor) {
    const id = parseId(rawId, "comisión");
    const offering = await prisma.courseOffering.findUnique({
      where: { courseOfferingId: id },
      include: {
        academicPeriod: true,
        studyPlanSubject: { include: { subject: true } },
        _count: { select: { courseEnrollments: true, classSessions: true, assessments: true } },
      },
    });
    if (!offering) throw new AppError(404, "COMMISSION_NOT_FOUND", "La comisión indicada no existe");
    const { courseEnrollments, classSessions, assessments } = offering._count;
    if (courseEnrollments + classSessions + assessments > 0) {
      throw new AppError(409, "COMMISSION_HAS_ACTIVITY", "La comisión ya tiene inscripciones, clases o evaluaciones: cerrala o cancelala en lugar de eliminarla.");
    }

    await prisma.$transaction([
      prisma.courseSchedule.deleteMany({ where: { courseOfferingId: id } }),
      prisma.teacherAssignment.deleteMany({ where: { courseOfferingId: id } }),
      prisma.courseOffering.delete({ where: { courseOfferingId: id } }),
    ]);
    await audit(actor, AUDIT.COMMISSION_DELETED, "COMISION", id,
      `Eliminó la comisión ${offering.commission} de ${offering.studyPlanSubject.subject.subjectCode} (${periodLabel(offering.academicPeriod)})`);
  },

  // ---- Turnos de examen ----

  async listExamSessions() {
    const sessions = await prisma.examSession.findMany({
      orderBy: [{ sessionStartDate: "desc" }],
      include: { _count: { select: { examCalls: true } } },
    });
    return {
      sessions: sessions.map((s) => ({
        id: String(s.examSessionId),
        name: s.examName,
        year: s.examYear,
        startDate: iso(s.sessionStartDate),
        endDate: iso(s.sessionEndDate),
        enrollmentStartDate: iso(s.enrollmentStartDate),
        enrollmentEndDate: iso(s.enrollmentEndDate),
        status: s.sessionStatus,
        windowStatus: windowStatus(s.enrollmentStartDate, s.enrollmentEndDate),
        callsCount: s._count.examCalls,
      })),
    };
  },

  async saveExamSession(rawId: unknown, body: Body, actor: Actor) {
    const id = rawId === undefined ? null : parseId(rawId, "turno");
    const name = parseText(body["name"], "El nombre del turno", 100)!;
    const range = parseRange(body, { start: "Inicio del turno", end: "Fin del turno" });
    const status = oneOf(body["status"] ?? "ABIERTA", CALL_STATUSES, "El estado del turno");
    const data = {
      examName: name,
      examYear: range.startDate.getUTCFullYear(),
      sessionStartDate: range.startDate,
      sessionEndDate: range.endDate,
      enrollmentStartDate: range.enrollmentStartDate,
      enrollmentEndDate: range.enrollmentEndDate,
      sessionStatus: status,
    };

    let saved;
    if (id) {
      if (!(await prisma.examSession.findUnique({ where: { examSessionId: id } }))) {
        throw new AppError(404, "EXAM_SESSION_NOT_FOUND", "El turno de examen indicado no existe");
      }
      const outside = await prisma.examCall.count({
        where: { examSessionId: id, OR: [{ callDate: { lt: range.startDate } }, { callDate: { gte: new Date(range.endDate.getTime() + 86_400_000) } }] },
      });
      if (outside > 0) throw invalid(`Hay ${outside} mesa(s) con fecha fuera de las nuevas fechas del turno`);
      saved = await prisma.examSession.update({ where: { examSessionId: id }, data });
    } else {
      saved = await prisma.examSession.create({ data });
    }

    await audit(actor, AUDIT.SESSION, "TURNO_EXAMEN", saved.examSessionId,
      `${id ? "Editó" : "Creó"} el turno ${name}: ${iso(saved.sessionStartDate)} a ${iso(saved.sessionEndDate)}, inscripción ${iso(saved.enrollmentStartDate)} a ${iso(saved.enrollmentEndDate)}`);
    return { id: String(saved.examSessionId) };
  },

  // ---- Mesas de examen ----

  async listExamCalls(rawSessionId: unknown, rawCareerId: unknown) {
    const sessionId = parseId(rawSessionId, "turno");
    const careerId = parseId(rawCareerId, "carrera");
    const calls = await prisma.examCall.findMany({
      where: { examSessionId: sessionId, studyPlanSubject: { studyPlan: { careerId } } },
      include: {
        studyPlanSubject: { select: { studyPlanSubjectId: true, subjectYear: true, subject: { select: { subjectCode: true, subjectName: true } } } },
        teacherProfile: { select: { teacherId: true, user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { examEnrollments: { where: { examStatus: { not: EXAM_STATUS.CANCELADA } } } } },
      },
      orderBy: [{ callDate: "asc" }],
    });
    return {
      calls: calls.map((c) => ({
        id: String(c.examCallId),
        subjectId: String(c.studyPlanSubject.studyPlanSubjectId),
        subjectCode: c.studyPlanSubject.subject.subjectCode,
        subjectName: c.studyPlanSubject.subject.subjectName,
        year: c.studyPlanSubject.subjectYear,
        date: iso(c.callDate),
        time: hhmm(c.callDate),
        classroom: c.classroom,
        capacity: c.capacity,
        enrolled: c._count.examEnrollments,
        status: c.callStatus,
        teacher: c.teacherProfile ? { id: String(c.teacherProfile.teacherId), fullName: `${c.teacherProfile.user.lastName}, ${c.teacherProfile.user.firstName}` } : null,
      })),
    };
  },

  async saveExamCall(rawId: unknown, body: Body, actor: Actor) {
    const id = rawId === undefined ? null : parseId(rawId, "mesa");
    const date = parseDate(body["date"], "Fecha de la mesa");
    const time = parseTime(body["time"], "Hora de la mesa");
    const callDate = new Date(`${iso(date)}T${time}:00.000Z`);
    const classroom = parseText(body["classroom"], "El aula", 50, false);
    const capacity = body["capacity"] === null || body["capacity"] === "" || body["capacity"] === undefined ? null : parseInt_(body["capacity"], "El cupo", 1, MAX_CAPACITY);
    const teacherId = body["teacherId"] ? parseId(body["teacherId"], "docente") : null;
    const status = oneOf(body["status"] ?? "ABIERTA", CALL_STATUSES, "El estado de la mesa");

    if (teacherId) {
      const teacher = await prisma.teacherProfile.findUnique({ where: { teacherId }, include: { user: true } });
      if (!teacher || !teacher.user.isActive || teacher.user.role !== ROLES.PROFESOR) {
        throw new AppError(409, "TEACHER_INACTIVE", "El docente indicado no existe o no está activo");
      }
    }

    const existing = id
      ? await prisma.examCall.findUnique({
          where: { examCallId: id },
          include: { _count: { select: { examEnrollments: { where: { examStatus: { not: EXAM_STATUS.CANCELADA } } } } } },
        })
      : null;
    if (id && !existing) throw new AppError(404, "EXAM_CALL_NOT_FOUND", "La mesa indicada no existe");

    const sessionId = existing ? existing.examSessionId : parseId(body["sessionId"], "turno");
    const subjectId = existing ? existing.studyPlanSubjectId : parseId(body["subjectId"], "materia");
    const [session, subject] = await Promise.all([
      prisma.examSession.findUnique({ where: { examSessionId: sessionId } }),
      prisma.studyPlanSubject.findUnique({ where: { studyPlanSubjectId: subjectId }, include: { subject: true } }),
    ]);
    if (!session) throw new AppError(404, "EXAM_SESSION_NOT_FOUND", "El turno de examen indicado no existe");
    if (!subject) throw new AppError(404, "SUBJECT_NOT_FOUND", "La materia indicada no existe");
    if (date < session.sessionStartDate || date > session.sessionEndDate) {
      throw invalid(`La mesa debe estar dentro del turno (${iso(session.sessionStartDate)} a ${iso(session.sessionEndDate)})`);
    }
    if (existing && capacity !== null && capacity < existing._count.examEnrollments) {
      throw new AppError(409, "CAPACITY_BELOW_ENROLLED", `La mesa ya tiene ${existing._count.examEnrollments} inscriptos: el cupo no puede ser menor.`);
    }

    const data = { callDate, classroom, capacity, teacherId, callStatus: status };
    const saved = existing
      ? await prisma.examCall.update({ where: { examCallId: existing.examCallId }, data })
      : await prisma.examCall.create({ data: { ...data, examSessionId: sessionId, studyPlanSubjectId: subjectId } });

    await audit(actor, existing ? AUDIT.CALL_UPDATED : AUDIT.CALL_CREATED, "MESA_EXAMEN", saved.examCallId,
      `${existing ? "Editó" : "Creó"} la mesa de ${subject.subject.subjectCode} - ${subject.subject.subjectName} (${session.examName}): ${iso(date)} ${time}${classroom ? `, aula ${classroom}` : ""}`);
    return { id: String(saved.examCallId) };
  },

  async deleteExamCall(rawId: unknown, actor: Actor) {
    const id = parseId(rawId, "mesa");
    const call = await prisma.examCall.findUnique({
      where: { examCallId: id },
      include: { examSession: true, studyPlanSubject: { include: { subject: true } }, _count: { select: { examEnrollments: true } } },
    });
    if (!call) throw new AppError(404, "EXAM_CALL_NOT_FOUND", "La mesa indicada no existe");
    if (call._count.examEnrollments > 0) {
      throw new AppError(409, "EXAM_CALL_HAS_ENROLLMENTS", "La mesa ya tiene inscripciones: cerrala en lugar de eliminarla.");
    }
    await prisma.examCall.delete({ where: { examCallId: id } });
    await audit(actor, AUDIT.CALL_DELETED, "MESA_EXAMEN", id,
      `Eliminó la mesa de ${call.studyPlanSubject.subject.subjectCode} del ${iso(call.callDate)} (${call.examSession.examName})`);
  },
};
