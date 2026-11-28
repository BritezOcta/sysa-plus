import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../lib/AppError.js";
import {
  formatScheduleText,
  schedulesOverlap,
  toScheduleDtos,
  type ScheduleSlot,
} from "../lib/schedule.js";
import { courseEnrollmentRepository as repo } from "../repositories/courseEnrollment.repository.js";
import {
  CORRELATIVITY_TYPE,
  ENROLLMENT_STATUS,
  OFFERING_STATUS,
  type CorrelativityType,
} from "../types/academic.js";
import type { AuthUser } from "../types/auth.js";
import type {
  AvailableSubjectDto,
  CommissionDto,
  EnrollmentOverviewDto,
  EnrollmentPeriodDto,
  MissingRequirementDto,
  StudentEnrollmentDto,
} from "../types/courseEnrollment.js";
import { AUDIT_ACTIONS, auditService } from "./audit.service.js";
import { notificationsService } from "./notifications.service.js";

export const ENROLLMENT_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  NO_ACTIVE_CAREER: "NO_ACTIVE_CAREER",
  STUDENT_INACTIVE: "STUDENT_INACTIVE",
  ENROLLMENT_PERIOD_CLOSED: "ENROLLMENT_PERIOD_CLOSED",
  OFFERING_NOT_FOUND: "OFFERING_NOT_FOUND",
  OFFERING_NOT_AVAILABLE: "OFFERING_NOT_AVAILABLE",
  SUBJECT_ALREADY_COMPLETED: "SUBJECT_ALREADY_COMPLETED",
  CORRELATIVITIES_NOT_MET: "CORRELATIVITIES_NOT_MET",
  ALREADY_ENROLLED: "ALREADY_ENROLLED",
  ALREADY_ENROLLED_IN_SUBJECT: "ALREADY_ENROLLED_IN_SUBJECT",
  SCHEDULE_CONFLICT: "SCHEDULE_CONFLICT",
  COMMISSION_FULL: "COMMISSION_FULL",
  ENROLLMENT_NOT_FOUND: "ENROLLMENT_NOT_FOUND",
  ENROLLMENT_NOT_ACTIVE: "ENROLLMENT_NOT_ACTIVE",
  CONCURRENT_UPDATE: "CONCURRENT_UPDATE",
} as const;

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

/** Fecha de hoy como medianoche UTC, comparable con las columnas DATE. */
export function todayAsDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDisplayDate(date: Date): string {
  const [year, month, day] = toIsoDate(date).split("-");
  return `${day}/${month}/${year}`;
}

// ---------------------------------------------------------------------------
// Período de inscripción
// ---------------------------------------------------------------------------

interface PeriodRecord {
  academicPeriodId: number;
  year: number;
  semester: number;
  enrollmentStartDate: Date | null;
  enrollmentEndDate: Date | null;
}

function isWindowOpen(period: PeriodRecord, today: Date): boolean {
  const { enrollmentStartDate: start, enrollmentEndDate: end } = period;
  return start !== null && end !== null && start <= today && today <= end;
}

function toPeriodDto(period: PeriodRecord, today: Date): EnrollmentPeriodDto {
  return {
    academicPeriodId: period.academicPeriodId,
    year: period.year,
    semester: period.semester,
    enrollmentStartDate: period.enrollmentStartDate
      ? toIsoDate(period.enrollmentStartDate)
      : "",
    enrollmentEndDate: period.enrollmentEndDate
      ? toIsoDate(period.enrollmentEndDate)
      : "",
    isOpen: isWindowOpen(period, today),
  };
}

/**
 * Período a mostrar: el que tiene la inscripción abierta hoy; si no hay, el próximo
 * en abrir; si tampoco, el último que cerró (para informar "inscripción cerrada").
 */
async function resolveCurrentPeriod(today: Date): Promise<PeriodRecord | null> {
  const periods = await repo.findPeriodsWithEnrollmentWindow();
  const open = periods.find((p) => isWindowOpen(p, today));
  if (open) return open;
  const upcoming = periods.find((p) => p.enrollmentStartDate! > today);
  if (upcoming) return upcoming;
  return periods.at(-1) ?? null;
}

function periodClosedError(period: PeriodRecord) {
  const range =
    period.enrollmentStartDate && period.enrollmentEndDate
      ? ` La inscripción para el ${period.semester}° cuatrimestre ${period.year} es del ${formatDisplayDate(period.enrollmentStartDate)} al ${formatDisplayDate(period.enrollmentEndDate)}.`
      : "";
  return new AppError(
    409,
    ENROLLMENT_ERROR_CODES.ENROLLMENT_PERIOD_CLOSED,
    `La inscripción a cursadas no se encuentra habilitada en este momento.${range}`,
  );
}

// ---------------------------------------------------------------------------
// Alumno
// ---------------------------------------------------------------------------

interface StudentContext {
  isActive: boolean;
  studentCareerId: number;
  careerName: string;
  studyPlanId: number;
  studyPlanResolution: string;
}

export async function loadStudentContext(
  userId: number,
): Promise<StudentContext> {
  const profile = await repo.findStudentContext(userId);

  // TODO(multi-carrera): si el alumno tiene más de una carrera activa se toma la primera.
  // Cuando haga falta, agregar un selector de carrera en la UI y recibir studentCareerId.
  for (const studentCareer of profile?.studentCareers ?? []) {
    if (!studentCareer.career.isActive) continue;
    const plan = studentCareer.studentStudyPlans.find(
      (ssp) => ssp.studyPlan.isActive,
    )?.studyPlan;
    if (!plan) continue;
    return {
      isActive: profile!.user.isActive,
      studentCareerId: studentCareer.studentCareerId,
      careerName: studentCareer.career.careerName,
      studyPlanId: plan.studyPlanId,
      studyPlanResolution: plan.resolution,
    };
  }

  throw new AppError(
    409,
    ENROLLMENT_ERROR_CODES.NO_ACTIVE_CAREER,
    "No tenés una carrera y un plan de estudios activos asociados. Comunicate con la Dirección.",
  );
}

function assertStudentActive(context: StudentContext) {
  // requireAuth ya corta las sesiones de usuarios dados de baja (RF-10); esto cubre el
  // caso de una baja entre que se cargó la pantalla y se confirmó la inscripción.
  if (!context.isActive) {
    throw new AppError(
      403,
      ENROLLMENT_ERROR_CODES.STUDENT_INACTIVE,
      "Tu cuenta se encuentra dada de baja o inactiva, por lo que no podés inscribirte. Comunicate con la Dirección.",
    );
  }
}

// ---------------------------------------------------------------------------
// Correlatividades
// ---------------------------------------------------------------------------

interface RequirementRecord {
  correlativityType: string;
  requiredSubject: {
    studyPlanSubjectId: number;
    subject: { subjectCode: string; subjectName: string };
  };
}

interface AcademicHistory {
  approved: Set<number>;
  regular: Set<number>;
}

function findMissingRequirements(
  requirements: RequirementRecord[],
  history: AcademicHistory,
): MissingRequirementDto[] {
  const missing: MissingRequirementDto[] = [];
  for (const req of requirements) {
    const id = req.requiredSubject.studyPlanSubjectId;
    const needsApproval =
      req.correlativityType === CORRELATIVITY_TYPE.APPROVED_TO_ENROLL;
    // Una materia aprobada también cumple el requisito de "regularizada".
    const satisfied = needsApproval
      ? history.approved.has(id)
      : history.approved.has(id) || history.regular.has(id);
    if (satisfied) continue;
    missing.push({
      studyPlanSubjectId: id,
      subjectCode: req.requiredSubject.subject.subjectCode,
      subjectName: req.requiredSubject.subject.subjectName,
      type: req.correlativityType as CorrelativityType,
      requiredCondition: needsApproval ? "APROBADA" : "REGULAR",
    });
  }
  return missing;
}

function describeMissing(missing: MissingRequirementDto[]): string {
  return missing
    .map(
      (m) =>
        `${m.subjectName} (${m.requiredCondition === "APROBADA" ? "aprobada" : "regularizada"})`,
    )
    .join(", ");
}

// ---------------------------------------------------------------------------
// Mapeo a DTO
// ---------------------------------------------------------------------------

interface OfferingRecord {
  courseOfferingId: number;
  commission: string;
  capacity: number;
  schedules: ScheduleSlot[];
  teacherAssignments: {
    teacherProfile: { user: { firstName: string; lastName: string } };
  }[];
  _count: { courseEnrollments: number };
}

function teacherNames(offering: OfferingRecord): string[] {
  return offering.teacherAssignments.map(
    ({ teacherProfile: { user } }) => `${user.firstName} ${user.lastName}`,
  );
}

function toCommissionDto(offering: OfferingRecord): CommissionDto {
  return {
    courseOfferingId: offering.courseOfferingId,
    name: offering.commission,
    schedules: toScheduleDtos(offering.schedules),
    scheduleText: formatScheduleText(offering.schedules),
    teachers: teacherNames(offering),
    enrolledCount: offering._count.courseEnrollments,
    capacity: offering.capacity,
  };
}

type ActiveEnrollmentRecord = Awaited<
  ReturnType<typeof repo.findActiveEnrollmentsInPeriod>
>[number];

function toStudentEnrollmentDto(
  record: ActiveEnrollmentRecord,
): StudentEnrollmentDto {
  const offering = record.courseOffering;
  return {
    courseEnrollmentId: record.courseEnrollmentId,
    courseOfferingId: offering.courseOfferingId,
    studyPlanSubjectId: offering.studyPlanSubjectId,
    subjectCode: offering.studyPlanSubject.subject.subjectCode,
    subjectName: offering.studyPlanSubject.subject.subjectName,
    commission: offering.commission,
    schedules: toScheduleDtos(offering.schedules),
    scheduleText: formatScheduleText(offering.schedules),
    teachers: teacherNames(offering),
    enrollmentDate: toIsoDate(record.enrollmentDate),
  };
}

// ---------------------------------------------------------------------------
// Errores de concurrencia
// ---------------------------------------------------------------------------

function mapConcurrencyError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: dos requests simultáneos del mismo alumno a la misma comisión.
    if (error.code === "P2002") {
      throw new AppError(
        409,
        ENROLLMENT_ERROR_CODES.ALREADY_ENROLLED,
        "Ya estás inscripto en esta comisión.",
      );
    }
    // P2034: conflicto de escritura / deadlock entre transacciones SERIALIZABLE.
    if (error.code === "P2034") {
      throw new AppError(
        409,
        ENROLLMENT_ERROR_CODES.CONCURRENT_UPDATE,
        "Muchos alumnos se están inscribiendo a esta comisión al mismo tiempo. Intentá nuevamente.",
      );
    }
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Servicio
// ---------------------------------------------------------------------------

export const courseEnrollmentService = {
  /** Pantalla de inscripción: período vigente, materias disponibles con comisiones y "Mis materias". */
  async getOverview(user: AuthUser): Promise<EnrollmentOverviewDto> {
    const context = await loadStudentContext(user.userId);
    const today = todayAsDate();
    const period = await resolveCurrentPeriod(today);

    const student = {
      isActive: context.isActive,
      careerName: context.careerName,
      studyPlan: context.studyPlanResolution,
    };

    if (!period) {
      return { period: null, student, subjects: [], enrollments: [] };
    }

    const [history, planSubjects, activeEnrollments] = await Promise.all([
      repo.findAcademicHistory(context.studentCareerId),
      repo.findOfferedPlanSubjects(
        context.studyPlanId,
        period.academicPeriodId,
      ),
      repo.findActiveEnrollmentsInPeriod(
        context.studentCareerId,
        period.academicPeriodId,
      ),
    ]);

    const subjects: AvailableSubjectDto[] = planSubjects
      // Las materias ya regularizadas o aprobadas no se vuelven a cursar.
      .filter(
        (sps) =>
          !history.approved.has(sps.studyPlanSubjectId) &&
          !history.regular.has(sps.studyPlanSubjectId),
      )
      .map((sps) => ({
        studyPlanSubjectId: sps.studyPlanSubjectId,
        subjectCode: sps.subject.subjectCode,
        subjectName: sps.subject.subjectName,
        year: sps.subjectYear,
        semester: sps.semester,
        missingRequirements: findMissingRequirements(sps.requirements, history),
        commissions: sps.courseOfferings.map(toCommissionDto),
      }));

    return {
      period: toPeriodDto(period, today),
      student,
      subjects,
      enrollments: activeEnrollments.map(toStudentEnrollmentDto),
    };
  },

  async enroll(
    user: AuthUser,
    rawCourseOfferingId: unknown,
    ipAddress: string | null,
  ): Promise<StudentEnrollmentDto> {
    const courseOfferingId = Number(rawCourseOfferingId);
    if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0) {
      throw new AppError(
        400,
        ENROLLMENT_ERROR_CODES.INVALID_INPUT,
        "Seleccioná una comisión válida.",
      );
    }

    const context = await loadStudentContext(user.userId);
    assertStudentActive(context);

    const offering = await repo.findOfferingForEnrollment(courseOfferingId);
    if (
      !offering ||
      offering.studyPlanSubject.studyPlanId !== context.studyPlanId ||
      !offering.studyPlanSubject.isActive
    ) {
      throw new AppError(
        404,
        ENROLLMENT_ERROR_CODES.OFFERING_NOT_FOUND,
        "La comisión seleccionada no existe o no pertenece a tu plan de estudios.",
      );
    }

    const today = todayAsDate();
    if (!isWindowOpen(offering.academicPeriod, today))
      throw periodClosedError(offering.academicPeriod);

    const subject = offering.studyPlanSubject;
    const subjectName = subject.subject.subjectName;

    if (offering.offeringStatus !== OFFERING_STATUS.ABIERTA) {
      throw new AppError(
        409,
        ENROLLMENT_ERROR_CODES.OFFERING_NOT_AVAILABLE,
        `La comisión ${offering.commission} de ${subjectName} no está habilitada para inscripciones.`,
      );
    }

    const history = await repo.findAcademicHistory(context.studentCareerId);
    if (
      history.approved.has(subject.studyPlanSubjectId) ||
      history.regular.has(subject.studyPlanSubjectId)
    ) {
      throw new AppError(
        409,
        ENROLLMENT_ERROR_CODES.SUBJECT_ALREADY_COMPLETED,
        `Ya tenés ${subjectName} regularizada o aprobada, no necesitás volver a cursarla.`,
      );
    }

    const missing = findMissingRequirements(subject.requirements, history);
    if (missing.length > 0) {
      throw new AppError(
        409,
        ENROLLMENT_ERROR_CODES.CORRELATIVITIES_NOT_MET,
        `No podés inscribirte a ${subjectName}. Debés tener previamente: ${describeMissing(missing)}.`,
        { missingRequirements: missing },
      );
    }

    const { studentCareerId } = context;
    const academicPeriodId = offering.academicPeriod.academicPeriodId;

    let courseEnrollmentId: number;
    try {
      courseEnrollmentId = await repo.runSerializable(async (tx) => {
        const active = await repo.findActiveEnrollmentsInPeriod(
          studentCareerId,
          academicPeriodId,
          tx,
        );

        if (
          active.some(
            (e) => e.courseOffering.courseOfferingId === courseOfferingId,
          )
        ) {
          throw new AppError(
            409,
            ENROLLMENT_ERROR_CODES.ALREADY_ENROLLED,
            "Ya estás inscripto en esta comisión.",
          );
        }

        const sameSubject = active.find(
          (e) =>
            e.courseOffering.studyPlanSubjectId === subject.studyPlanSubjectId,
        );
        if (sameSubject) {
          throw new AppError(
            409,
            ENROLLMENT_ERROR_CODES.ALREADY_ENROLLED_IN_SUBJECT,
            `Ya estás inscripto a ${subjectName} en la comisión ${sameSubject.courseOffering.commission}. Si querés cambiar de comisión, primero cancelá esa inscripción.`,
          );
        }

        const conflict = active.find((e) =>
          schedulesOverlap(e.courseOffering.schedules, offering.schedules),
        );
        if (conflict) {
          throw new AppError(
            409,
            ENROLLMENT_ERROR_CODES.SCHEDULE_CONFLICT,
            `El horario de esta comisión (${formatScheduleText(offering.schedules)}) se superpone con ${conflict.courseOffering.studyPlanSubject.subject.subjectName} (${formatScheduleText(conflict.courseOffering.schedules)}). Por favor elegí otra comisión.`,
            { conflictWith: toStudentEnrollmentDto(conflict) },
          );
        }

        const enrolledCount = await repo.countActiveEnrollments(
          courseOfferingId,
          tx,
        );
        if (enrolledCount >= offering.capacity) {
          throw new AppError(
            409,
            ENROLLMENT_ERROR_CODES.COMMISSION_FULL,
            `La comisión ${offering.commission} de ${subjectName} ya no cuenta con vacantes disponibles.`,
          );
        }

        // Si se había inscripto antes a esta misma comisión y canceló, se reactiva ese registro.
        const previous = await repo.findEnrollment(
          studentCareerId,
          courseOfferingId,
          tx,
        );
        const saved = previous
          ? await repo.reactivateEnrollment(
              previous.courseEnrollmentId,
              today,
              tx,
            )
          : await repo.createEnrollment(
              studentCareerId,
              courseOfferingId,
              today,
              tx,
            );
        return saved.courseEnrollmentId;
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      mapConcurrencyError(error);
    }

    await auditService.record({
      userId: user.userId,
      action: AUDIT_ACTIONS.COURSE_ENROLLMENT_CREATED,
      entity: "COURSE_ENROLLMENT",
      entityId: String(courseEnrollmentId),
      details: `Inscripción a ${subject.subject.subjectCode} - ${subjectName}, comisión ${offering.commission} (${offering.academicPeriod.semester}° cuat. ${offering.academicPeriod.year})`,
      ipAddress,
    });

    await notificationsService.notify({
      userId: user.userId,
      title: "Inscripción a cursada confirmada",
      body: `Te inscribiste correctamente en ${subjectName} (Comisión ${offering.commission} - ${offering.academicPeriod.semester}° cuat. ${offering.academicPeriod.year}).`,
      type: "info",
      link: "/alumno/cursado",
    });

    const enrollments = await repo.findActiveEnrollmentsInPeriod(
      studentCareerId,
      academicPeriodId,
    );
    const created = enrollments.find(
      (e) => e.courseEnrollmentId === courseEnrollmentId,
    );
    if (!created)
      throw new Error(
        `Inscripción ${courseEnrollmentId} no encontrada luego de guardarla`,
      );
    return toStudentEnrollmentDto(created);
  },

  async cancel(
    user: AuthUser,
    rawCourseEnrollmentId: unknown,
    ipAddress: string | null,
  ): Promise<void> {
    const courseEnrollmentId = Number(rawCourseEnrollmentId);
    if (!Number.isInteger(courseEnrollmentId) || courseEnrollmentId <= 0) {
      throw new AppError(
        400,
        ENROLLMENT_ERROR_CODES.INVALID_INPUT,
        "Inscripción inválida.",
      );
    }

    const enrollment = await repo.findEnrollmentById(courseEnrollmentId);
    // Una inscripción de otro alumno se informa como inexistente.
    if (
      !enrollment ||
      enrollment.studentCareer.studentProfile.userId !== user.userId
    ) {
      throw new AppError(
        404,
        ENROLLMENT_ERROR_CODES.ENROLLMENT_NOT_FOUND,
        "La inscripción no existe.",
      );
    }

    if (enrollment.enrollmentStatus !== ENROLLMENT_STATUS.INSCRIPTO) {
      throw new AppError(
        409,
        ENROLLMENT_ERROR_CODES.ENROLLMENT_NOT_ACTIVE,
        "Esta inscripción ya no está vigente.",
      );
    }

    const { academicPeriod, commission, studyPlanSubject } =
      enrollment.courseOffering;
    if (!isWindowOpen(academicPeriod, todayAsDate())) {
      throw new AppError(
        409,
        ENROLLMENT_ERROR_CODES.ENROLLMENT_PERIOD_CLOSED,
        "No podés cancelar la inscripción porque el período de inscripción ya cerró.",
      );
    }

    await repo.cancelEnrollment(courseEnrollmentId);

    await auditService.record({
      userId: user.userId,
      action: AUDIT_ACTIONS.COURSE_ENROLLMENT_CANCELLED,
      entity: "COURSE_ENROLLMENT",
      entityId: String(courseEnrollmentId),
      details: `Cancelación de inscripción a ${studyPlanSubject.subject.subjectCode} - ${studyPlanSubject.subject.subjectName}, comisión ${commission}`,
      ipAddress,
    });

    await notificationsService.notify({
      userId: user.userId,
      title: "Baja de cursada confirmada",
      body: `Cancelaste tu inscripción a ${studyPlanSubject.subject.subjectName} (Comisión ${commission}).`,
      type: "info",
      link: "/alumno/cursado",
    });
  },
};
