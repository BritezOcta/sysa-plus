import { AppError } from "../lib/AppError.js";
import { formatScheduleText, schedulesOverlap, toScheduleDtos } from "../lib/schedule.js";
import { teacherAssignmentRepository as repo } from "../repositories/teacherAssignment.repository.js";
import { auditService } from "./audit.service.js";
import { ROLES } from "../types/auth.js";
import {
  ASSIGNMENT_ROLE,
  OFFERING_STATUS,
  type AssignmentRole,
} from "../types/academic.js";

export const TEACHER_ASSIGNMENT_AUDIT = {
  ASSIGNED: "TEACHER_ASSIGNED",
  UNASSIGNED: "TEACHER_UNASSIGNED",
  ROLE_CHANGED: "TEACHER_ROLE_CHANGED",
} as const;

const AUDIT_ENTITY = "ASIGNACION_DOCENTE";

export interface Actor {
  userId: number;
  ipAddress: string | null;
}

interface TeacherUser {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  role: string;
  isActive: boolean;
}

function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.lastName}, ${user.firstName}`;
}

/** Un docente puede recibir comisiones solo si su usuario es PROFESOR y está activo (RF-03 3.3). */
function isAssignable(user: TeacherUser): boolean {
  return user.isActive && user.role === ROLES.PROFESOR;
}

function parseId(raw: unknown, label: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", `El identificador de ${label} no es válido`);
  }
  return id;
}

function parseRole(raw: unknown): AssignmentRole {
  if (raw === ASSIGNMENT_ROLE.TITULAR || raw === ASSIGNMENT_ROLE.AYUDANTE) return raw;
  throw new AppError(400, "VALIDATION_ERROR", "El rol debe ser TITULAR o AYUDANTE", {
    allowedRoles: Object.values(ASSIGNMENT_ROLE),
  });
}

function periodLabel(period: { year: number; semester: number }): string {
  return `${period.semester}° cuatrimestre ${period.year}`;
}

function semesterToPeriod(semester: number | null): 1 | 2 | "anual" | null {
  if (semester === null) return null;
  if (semester === 0) return "anual";
  return semester === 2 ? 2 : 1;
}

function roleLabel(role: string): string {
  return role === ASSIGNMENT_ROLE.AYUDANTE ? "ayudante" : "titular";
}

function assertSingleTitular(
  assignments: Array<{ teacherAssignmentId: number; assignmentRole: string }>,
  commission: string,
  ignoreAssignmentId?: number,
) {
  const hasTitular = assignments.some(
    (a) => a.assignmentRole === ASSIGNMENT_ROLE.TITULAR && a.teacherAssignmentId !== ignoreAssignmentId,
  );
  if (hasTitular) {
    throw new AppError(
      409,
      "TITULAR_ALREADY_ASSIGNED",
      `La comisión ${commission} ya tiene un docente titular. Asigná este docente como ayudante o cambiá primero el rol del titular actual.`,
    );
  }
}

export const teacherAssignmentService = {
  /** Datos para los filtros de la pantalla: carreras, períodos y docentes. */
  async getOptions() {
    const [careers, periods, teachers] = await Promise.all([
      repo.listCareers(),
      repo.listPeriods(),
      repo.listTeachers(),
    ]);

    const today = new Date();
    const current = periods.find((p) => p.periodStartDate <= today && today <= p.periodEndDate);

    return {
      careers: careers.map((c) => ({
        id: String(c.careerId),
        code: c.careerCode,
        name: c.careerName,
        durationYears: c.durationYears,
        isActive: c.isActive,
      })),
      periods: periods.map((p) => ({
        id: String(p.academicPeriodId),
        year: p.year,
        semester: p.semester,
        label: periodLabel(p),
        isCurrent: p.academicPeriodId === current?.academicPeriodId,
      })),
      defaultPeriodId: String(current?.academicPeriodId ?? periods[0]?.academicPeriodId ?? ""),
      teachers: teachers.map((t) => ({
        id: String(t.teacherId),
        fullName: fullName(t.user),
        dni: t.user.dni,
        email: t.user.email,
        isActive: isAssignable(t.user),
      })),
    };
  },

  /** Comisiones de una carrera en un período, agrupables por año/cuatrimestre (RF-03 3.4). */
  async getCommissions(rawCareerId: unknown, rawPeriodId: unknown) {
    const careerId = parseId(rawCareerId, "carrera");
    const periodId = parseId(rawPeriodId, "período");

    const [career, period] = await Promise.all([repo.findCareer(careerId), repo.findPeriod(periodId)]);
    if (!career) throw new AppError(404, "CAREER_NOT_FOUND", "La carrera indicada no existe");
    if (!period) throw new AppError(404, "PERIOD_NOT_FOUND", "El período académico indicado no existe");

    // Las comisiones anuales se registran en el 1er cuatrimestre y siguen dictándose en el 2do:
    // al mirar el 2do cuatrimestre también se muestran las anuales de ese año.
    const firstSemester =
      period.semester === 2 ? await repo.findPeriodByYearSemester(period.year, 1) : null;
    const periodIds = [periodId, ...(firstSemester ? [firstSemester.academicPeriodId] : [])];
    const planSubjects = await repo.findPlanSubjectsWithOfferings(careerId, periodIds);

    return {
      career: { id: String(career.careerId), code: career.careerCode, name: career.careerName, durationYears: career.durationYears },
      period: { id: String(period.academicPeriodId), label: periodLabel(period) },
      subjects: planSubjects.map((sps) => ({
        id: String(sps.studyPlanSubjectId),
        code: sps.subject.subjectCode,
        name: sps.subject.subjectName,
        year: sps.subjectYear,
        period: semesterToPeriod(sps.semester),
        isActive: sps.isActive,
        commissions: sps.courseOfferings
          .filter((co) => co.academicPeriodId === periodId || sps.semester === 0)
          .map((co) => ({
          id: String(co.courseOfferingId),
          code: co.commission,
          capacity: co.capacity,
          status: co.offeringStatus,
          enrolledCount: co._count.courseEnrollments,
          schedule: toScheduleDtos(co.schedules),
          scheduleText: formatScheduleText(co.schedules),
          teachers: co.teacherAssignments.map((ta) => ({
            assignmentId: String(ta.teacherAssignmentId),
            teacherId: String(ta.teacherId),
            fullName: fullName(ta.teacherProfile.user),
            role: ta.assignmentRole,
            isActive: isAssignable(ta.teacherProfile.user),
          })),
        })),
      })),
    };
  },

  /** Materias y comisiones a cargo de un docente (RF-03 3.4). */
  async getTeacherLoad(rawTeacherId: unknown) {
    const teacherId = parseId(rawTeacherId, "docente");
    const teacher = await repo.findTeacher(teacherId);
    if (!teacher) throw new AppError(404, "TEACHER_NOT_FOUND", "El docente indicado no existe");

    const assignments = await repo.findAssignmentsByTeacher(teacherId);
    return {
      teacher: { id: String(teacher.teacherId), fullName: fullName(teacher.user), isActive: isAssignable(teacher.user) },
      assignments: assignments.map((ta) => {
        const co = ta.courseOffering;
        return {
          assignmentId: String(ta.teacherAssignmentId),
          role: ta.assignmentRole,
          commissionId: String(co.courseOfferingId),
          commission: co.commission,
          status: co.offeringStatus,
          period: periodLabel(co.academicPeriod),
          careerName: co.studyPlanSubject.studyPlan.career.careerName,
          subjectCode: co.studyPlanSubject.subject.subjectCode,
          subjectName: co.studyPlanSubject.subject.subjectName,
          scheduleText: formatScheduleText(co.schedules),
        };
      }),
    };
  },

  /** RF-03 3.3: asigna un docente a una comisión. */
  async assign(input: { courseOfferingId: unknown; teacherId: unknown; role: unknown }, actor: Actor) {
    const courseOfferingId = parseId(input.courseOfferingId, "comisión");
    const teacherId = parseId(input.teacherId, "docente");
    const role = parseRole(input.role);

    const offering = await repo.findOffering(courseOfferingId);
    if (!offering) {
      throw new AppError(
        404,
        "COMMISSION_NOT_FOUND",
        "La comisión indicada no existe. Creá la cursada antes de asignar un docente.",
      );
    }
    if (offering.offeringStatus === OFFERING_STATUS.CANCELADA) {
      throw new AppError(
        409,
        "COMMISSION_CANCELLED",
        `La comisión ${offering.commission} está cancelada; no se le pueden asignar docentes.`,
      );
    }

    const teacher = await repo.findTeacher(teacherId);
    if (!teacher) throw new AppError(404, "TEACHER_NOT_FOUND", "El docente indicado no existe");
    if (!isAssignable(teacher.user)) {
      throw new AppError(
        409,
        "TEACHER_INACTIVE",
        `${fullName(teacher.user)} no está activo como profesor en el sistema; no se le pueden asignar comisiones.`,
      );
    }

    const subjectName = offering.studyPlanSubject.subject.subjectName;
    if (await repo.findAssignmentByPair(teacherId, courseOfferingId)) {
      throw new AppError(
        409,
        "DUPLICATE_ASSIGNMENT",
        `${fullName(teacher.user)} ya se encuentra asignado a ${subjectName}, comisión ${offering.commission}.`,
      );
    }
    if (role === ASSIGNMENT_ROLE.TITULAR) {
      assertSingleTitular(offering.teacherAssignments, offering.commission);
    }

    let created;
    try {
      created = await repo.createAssignment({ teacherId, courseOfferingId, assignmentRole: role });
    } catch (err) {
      // Dos administradores asignando a la vez: la restricción única de la base responde P2002.
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
        throw new AppError(409, "DUPLICATE_ASSIGNMENT", `${fullName(teacher.user)} ya se encuentra asignado a esa comisión.`);
      }
      throw err;
    }

    // Aviso (no bloquea): el docente ya dicta otra comisión en el mismo horario del período.
    const others = await repo.findTeacherOfferingsInPeriod(teacherId, offering.academicPeriodId, courseOfferingId);
    const warnings = others
      .filter((o) => schedulesOverlap(offering.schedules, o.courseOffering.schedules))
      .map(
        (o) =>
          `Superposición horaria: ${fullName(teacher.user)} también dicta ${o.courseOffering.studyPlanSubject.subject.subjectName} (comisión ${o.courseOffering.commission}) en ${formatScheduleText(o.courseOffering.schedules)}.`,
      );

    await auditService.record({
      userId: actor.userId,
      action: TEACHER_ASSIGNMENT_AUDIT.ASSIGNED,
      entity: AUDIT_ENTITY,
      entityId: String(created.teacherAssignmentId),
      details: `Asignó a ${fullName(teacher.user)} como ${roleLabel(role)} en ${offering.studyPlanSubject.subject.subjectCode} - ${subjectName}, comisión ${offering.commission} (${periodLabel(offering.academicPeriod)})`,
      ipAddress: actor.ipAddress,
    });

    return { assignmentId: String(created.teacherAssignmentId), warnings };
  },

  /** Cambia el rol (titular/ayudante) de una asignación existente. */
  async changeRole(rawAssignmentId: unknown, rawRole: unknown, actor: Actor) {
    const assignmentId = parseId(rawAssignmentId, "asignación");
    const role = parseRole(rawRole);

    const assignment = await repo.findAssignment(assignmentId);
    if (!assignment) throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "La asignación indicada no existe");
    if (assignment.assignmentRole === role) {
      throw new AppError(409, "NO_CHANGES", `El docente ya figura como ${roleLabel(role)} en esa comisión.`);
    }

    const offering = await repo.findOffering(assignment.courseOfferingId);
    if (role === ASSIGNMENT_ROLE.TITULAR && offering) {
      assertSingleTitular(offering.teacherAssignments, offering.commission, assignmentId);
    }

    await repo.updateAssignmentRole(assignmentId, role);
    const co = assignment.courseOffering;
    await auditService.record({
      userId: actor.userId,
      action: TEACHER_ASSIGNMENT_AUDIT.ROLE_CHANGED,
      entity: AUDIT_ENTITY,
      entityId: String(assignmentId),
      details: `Cambió a ${fullName(assignment.teacherProfile.user)} de ${roleLabel(assignment.assignmentRole)} a ${roleLabel(role)} en ${co.studyPlanSubject.subject.subjectCode}, comisión ${co.commission} (${periodLabel(co.academicPeriod)})`,
      ipAddress: actor.ipAddress,
    });

    return { role };
  },

  /** Desasigna un docente; pierde el acceso a la comisión (RF-03 3.4). */
  async unassign(rawAssignmentId: unknown, actor: Actor) {
    const assignmentId = parseId(rawAssignmentId, "asignación");
    const assignment = await repo.findAssignment(assignmentId);
    if (!assignment) throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "La asignación indicada no existe");

    await repo.deleteAssignment(assignmentId);
    const co = assignment.courseOffering;
    await auditService.record({
      userId: actor.userId,
      action: TEACHER_ASSIGNMENT_AUDIT.UNASSIGNED,
      entity: AUDIT_ENTITY,
      entityId: String(assignmentId),
      details: `Desasignó a ${fullName(assignment.teacherProfile.user)} (${roleLabel(assignment.assignmentRole)}) de ${co.studyPlanSubject.subject.subjectCode} - ${co.studyPlanSubject.subject.subjectName}, comisión ${co.commission} (${periodLabel(co.academicPeriod)})`,
      ipAddress: actor.ipAddress,
    });
  },
};
