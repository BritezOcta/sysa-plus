import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../lib/AppError.js";
import { courseEnrollmentRepository } from "../repositories/courseEnrollment.repository.js";
import { examEnrollmentRepository as repo } from "../repositories/examEnrollment.repository.js";
import {
  EXAM_CALL_STATUS,
  EXAM_STATUS,
  REGULARITY_VALID_YEARS,
  type CorrelativityType,
} from "../types/academic.js";
import type { AuthUser } from "../types/auth.js";
import type { MissingRequirementDto } from "../types/courseEnrollment.js";
import type {
  ExamCallDto,
  ExamEnrollmentOverviewDto,
  ExamIneligibilityCode,
  ExamSessionDto,
  StudentExamEnrollmentDto,
} from "../types/examEnrollment.js";
import { AUDIT_ACTIONS, auditService } from "./audit.service.js";
import {
  formatDisplayDate,
  loadStudentContext,
  todayAsDate,
  toIsoDate,
} from "./courseEnrollment.service.js";
import { notificationsService } from "./notifications.service.js";

export const EXAM_ENROLLMENT_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  STUDENT_INACTIVE: "STUDENT_INACTIVE",
  EXAM_PERIOD_CLOSED: "EXAM_PERIOD_CLOSED",
  CALL_NOT_FOUND: "CALL_NOT_FOUND",
  CALL_NOT_AVAILABLE: "CALL_NOT_AVAILABLE",
  SUBJECT_ALREADY_APPROVED: "SUBJECT_ALREADY_APPROVED",
  NOT_REGULAR: "NOT_REGULAR",
  REGULARITY_EXPIRED: "REGULARITY_EXPIRED",
  CORRELATIVITIES_NOT_MET: "CORRELATIVITIES_NOT_MET",
  ALREADY_ENROLLED: "ALREADY_ENROLLED",
  ALREADY_ENROLLED_IN_SUBJECT: "ALREADY_ENROLLED_IN_SUBJECT",
  CALL_FULL: "CALL_FULL",
  ENROLLMENT_NOT_FOUND: "ENROLLMENT_NOT_FOUND",
  ENROLLMENT_NOT_ACTIVE: "ENROLLMENT_NOT_ACTIVE",
  CONCURRENT_UPDATE: "CONCURRENT_UPDATE",
} as const;

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------
// CALL_DATE guarda la hora "de pared" de la mesa en los campos UTC (igual que las
// columnas DATE), así que se lee siempre con getUTC* para no correrla por el huso horario.

function toTime(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

/** La regularidad vence REGULARITY_VALID_YEARS después del fin del cuatrimestre en que se obtuvo. */
export function regularityExpiry(periodEndDate: Date): Date {
  const expiry = new Date(periodEndDate);
  expiry.setUTCFullYear(expiry.getUTCFullYear() + REGULARITY_VALID_YEARS);
  return expiry;
}

// ---------------------------------------------------------------------------
// Turno de examen
// ---------------------------------------------------------------------------

interface SessionRecord {
  examSessionId: number;
  examName: string;
  enrollmentStartDate: Date | null;
  enrollmentEndDate: Date | null;
}

function isWindowOpen(session: SessionRecord, today: Date): boolean {
  const { enrollmentStartDate: start, enrollmentEndDate: end } = session;
  return start !== null && end !== null && start <= today && today <= end;
}

function toSessionDto(session: SessionRecord, today: Date): ExamSessionDto {
  return {
    examSessionId: session.examSessionId,
    name: session.examName,
    enrollmentStartDate: session.enrollmentStartDate
      ? toIsoDate(session.enrollmentStartDate)
      : "",
    enrollmentEndDate: session.enrollmentEndDate
      ? toIsoDate(session.enrollmentEndDate)
      : "",
    isOpen: isWindowOpen(session, today),
  };
}

/** Turno a mostrar: el que tiene la inscripción abierta hoy; si no, el próximo; si tampoco, el último. */
async function resolveCurrentSession(
  today: Date,
): Promise<SessionRecord | null> {
  const sessions = await repo.findSessionsWithEnrollmentWindow();
  return (
    sessions.find((s) => isWindowOpen(s, today)) ??
    sessions.find((s) => s.enrollmentStartDate! > today) ??
    sessions.at(-1) ??
    null
  );
}

function periodClosedError(session: SessionRecord) {
  const range =
    session.enrollmentStartDate && session.enrollmentEndDate
      ? ` La inscripción a las mesas de ${session.examName} es del ${formatDisplayDate(session.enrollmentStartDate)} al ${formatDisplayDate(session.enrollmentEndDate)}.`
      : "";
  return new AppError(
    409,
    EXAM_ENROLLMENT_ERROR_CODES.EXAM_PERIOD_CLOSED,
    `La inscripción a exámenes no se encuentra habilitada en este momento.${range}`,
  );
}

// ---------------------------------------------------------------------------
// Condición del alumno en la materia
// ---------------------------------------------------------------------------

interface StudentStanding {
  approved: Set<number>;
  /** Materia → fin del cuatrimestre de su regularización más reciente (solo cursadas terminadas). */
  regularSince: Map<number, Date>;
}

async function loadStanding(
  studentCareerId: number,
  today: Date,
): Promise<StudentStanding> {
  const [history, regularCourses] = await Promise.all([
    courseEnrollmentRepository.findAcademicHistory(studentCareerId),
    repo.findRegularCourses(studentCareerId),
  ]);

  const regularSince = new Map<number, Date>();
  for (const { courseOffering } of regularCourses) {
    const end = courseOffering.academicPeriod.periodEndDate;
    // Mientras el cuatrimestre no termina, REGULAR es una condición parcial de RF-05, no el cierre de la cursada.
    if (end >= today) continue;
    const previous = regularSince.get(courseOffering.studyPlanSubjectId);
    if (!previous || end > previous)
      regularSince.set(courseOffering.studyPlanSubjectId, end);
  }
  return { approved: history.approved, regularSince };
}

type CallRecord = Awaited<ReturnType<typeof repo.findOpenCalls>>[number];

function findMissingRequirements(
  call: CallRecord,
  standing: StudentStanding,
): MissingRequirementDto[] {
  return call.studyPlanSubject.requirements
    .filter(
      (req) => !standing.approved.has(req.requiredSubject.studyPlanSubjectId),
    )
    .map((req) => ({
      studyPlanSubjectId: req.requiredSubject.studyPlanSubjectId,
      subjectCode: req.requiredSubject.subject.subjectCode,
      subjectName: req.requiredSubject.subject.subjectName,
      type: req.correlativityType as CorrelativityType,
      requiredCondition: "APROBADA",
    }));
}

interface Ineligibility {
  code: ExamIneligibilityCode;
  message: string;
}

/**
 * Condiciones académicas para rendir la materia de la mesa: regularidad vigente a la
 * fecha de la mesa y correlativas para rendir aprobadas. Cupo y duplicados se validan aparte.
 */
function checkAcademicConditions(
  call: CallRecord,
  standing: StudentStanding,
  missing: MissingRequirementDto[],
): Ineligibility | null {
  const subjectName = call.studyPlanSubject.subject.subjectName;
  const regularSince = standing.regularSince.get(
    call.studyPlanSubject.studyPlanSubjectId,
  );

  if (!regularSince) {
    // TODO(RF-06): el PDF admite rendir en condición de libre "según corresponda"; falta definir
    // qué materias lo permiten. Por ahora solo se rinde con la cursada regularizada.
    return {
      code: "NOT_REGULAR",
      message: `Necesitás tener la cursada de ${subjectName} regularizada para rendir el final.`,
    };
  }

  const expiry = regularityExpiry(regularSince);
  if (call.callDate > expiry) {
    return {
      code: "REGULARITY_EXPIRED",
      message: `Tu regularidad en ${subjectName} venció el ${formatDisplayDate(expiry)}, por lo que no podés inscribirte como alumno regular.`,
    };
  }

  if (missing.length > 0) {
    const list = missing.map((m) => m.subjectName).join(", ");
    return {
      code: "CORRELATIVITIES_NOT_MET",
      message: `Para rendir ${subjectName} tenés que tener aprobadas: ${list}.`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mapeo a DTO
// ---------------------------------------------------------------------------

function teacherName(
  teacher: { user: { firstName: string; lastName: string } } | null,
): string | null {
  return teacher ? `${teacher.user.firstName} ${teacher.user.lastName}` : null;
}

function enrollmentCode(examEnrollmentId: number): string {
  return `EX-${String(examEnrollmentId).padStart(6, "0")}`;
}

type EnrollmentRecord = Awaited<
  ReturnType<typeof repo.findUpcomingEnrollments>
>[number];

function toEnrollmentDto(
  record: EnrollmentRecord,
  today: Date,
): StudentExamEnrollmentDto {
  const call = record.examCall;
  return {
    examEnrollmentId: record.examEnrollmentId,
    enrollmentCode: enrollmentCode(record.examEnrollmentId),
    examCallId: call.examCallId,
    studyPlanSubjectId: call.studyPlanSubject.studyPlanSubjectId,
    subjectCode: call.studyPlanSubject.subject.subjectCode,
    subjectName: call.studyPlanSubject.subject.subjectName,
    sessionName: call.examSession.examName,
    date: toIsoDate(call.callDate),
    time: toTime(call.callDate),
    classroom: call.classroom,
    teacher: teacherName(call.teacherProfile),
    canCancel: isWindowOpen(call.examSession, today),
  };
}

function mapConcurrencyError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: dos requests simultáneos del mismo alumno a la misma mesa.
    if (error.code === "P2002") {
      throw new AppError(
        409,
        EXAM_ENROLLMENT_ERROR_CODES.ALREADY_ENROLLED,
        "Ya estás inscripto en esta mesa.",
      );
    }
    // P2034: conflicto de escritura / deadlock entre transacciones SERIALIZABLE.
    if (error.code === "P2034") {
      throw new AppError(
        409,
        EXAM_ENROLLMENT_ERROR_CODES.CONCURRENT_UPDATE,
        "Muchos alumnos se están inscribiendo a esta mesa al mismo tiempo. Intentá nuevamente.",
      );
    }
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Servicio
// ---------------------------------------------------------------------------

export const examEnrollmentService = {
  /** Pantalla de inscripción: turno vigente, mesas con la habilitación del alumno y "Mis exámenes". */
  async getOverview(user: AuthUser): Promise<ExamEnrollmentOverviewDto> {
    const context = await loadStudentContext(user.userId);
    const today = todayAsDate();
    const [session, upcoming, standing] = await Promise.all([
      resolveCurrentSession(today),
      repo.findUpcomingEnrollments(context.studentCareerId, today),
      loadStanding(context.studentCareerId, today),
    ]);

    const student = {
      isActive: context.isActive,
      careerName: context.careerName,
      studyPlan: context.studyPlanResolution,
    };
    const enrollments = upcoming.map((e) => toEnrollmentDto(e, today));
    if (!session) return { session: null, student, calls: [], enrollments };

    const calls = await repo.findOpenCalls(
      session.examSessionId,
      context.studyPlanId,
    );
    const enrolledCallIds = new Set(enrollments.map((e) => e.examCallId));
    const enrolledSubjectIds = new Set(
      enrollments.map((e) => e.studyPlanSubjectId),
    );
    const callCountBySubject = new Map<number, number>();

    const callDtos: ExamCallDto[] = [];
    for (const call of calls) {
      const subjectId = call.studyPlanSubject.studyPlanSubjectId;
      // El número de llamado cuenta todas las mesas de la materia en el turno, aunque esté aprobada.
      const callNumber = (callCountBySubject.get(subjectId) ?? 0) + 1;
      callCountBySubject.set(subjectId, callNumber);
      // Las materias ya aprobadas no se vuelven a rendir: no se listan.
      if (standing.approved.has(subjectId)) continue;

      const missing = findMissingRequirements(call, standing);
      let ineligibility: Ineligibility | null = null;
      if (!enrolledCallIds.has(call.examCallId)) {
        ineligibility = checkAcademicConditions(call, standing, missing);
        if (!ineligibility && enrolledSubjectIds.has(subjectId)) {
          ineligibility = {
            code: "ALREADY_ENROLLED_IN_SUBJECT",
            message: "Ya estás inscripto en otro llamado de esta materia.",
          };
        }
        if (
          !ineligibility &&
          call.capacity !== null &&
          call._count.examEnrollments >= call.capacity
        ) {
          ineligibility = {
            code: "CALL_FULL",
            message: "La mesa no tiene más cupo disponible.",
          };
        }
      }

      callDtos.push({
        examCallId: call.examCallId,
        studyPlanSubjectId: subjectId,
        subjectCode: call.studyPlanSubject.subject.subjectCode,
        subjectName: call.studyPlanSubject.subject.subjectName,
        year: call.studyPlanSubject.subjectYear,
        callNumber,
        date: toIsoDate(call.callDate),
        time: toTime(call.callDate),
        classroom: call.classroom,
        teacher: teacherName(call.teacherProfile),
        capacity: call.capacity,
        enrolledCount: call._count.examEnrollments,
        ineligibility,
        missingRequirements: missing,
      });
    }

    return {
      session: toSessionDto(session, today),
      student,
      calls: callDtos,
      enrollments,
    };
  },

  async enroll(
    user: AuthUser,
    rawExamCallId: unknown,
    ipAddress: string | null,
  ): Promise<StudentExamEnrollmentDto> {
    const examCallId = Number(rawExamCallId);
    if (!Number.isInteger(examCallId) || examCallId <= 0) {
      throw new AppError(
        400,
        EXAM_ENROLLMENT_ERROR_CODES.INVALID_INPUT,
        "Seleccioná una mesa de examen válida.",
      );
    }

    const context = await loadStudentContext(user.userId);
    // requireAuth ya corta las sesiones de usuarios dados de baja (RF-10); esto cubre una baja
    // entre que se cargó la pantalla y se confirmó la inscripción.
    if (!context.isActive) {
      throw new AppError(
        403,
        EXAM_ENROLLMENT_ERROR_CODES.STUDENT_INACTIVE,
        "Tu cuenta se encuentra dada de baja o inactiva, por lo que no podés inscribirte a exámenes. Comunicate con la Dirección.",
      );
    }

    const call = await repo.findCall(examCallId);
    const subject = call?.studyPlanSubject;
    if (
      !call ||
      !subject ||
      subject.studyPlanId !== context.studyPlanId ||
      !subject.isActive
    ) {
      throw new AppError(
        404,
        EXAM_ENROLLMENT_ERROR_CODES.CALL_NOT_FOUND,
        "La mesa de examen seleccionada no existe o no corresponde a tu plan de estudios.",
      );
    }

    const today = todayAsDate();
    if (!isWindowOpen(call.examSession, today))
      throw periodClosedError(call.examSession);

    const subjectName = subject.subject.subjectName;
    if (call.callStatus !== EXAM_CALL_STATUS.ABIERTA) {
      throw new AppError(
        409,
        EXAM_ENROLLMENT_ERROR_CODES.CALL_NOT_AVAILABLE,
        `La mesa de ${subjectName} del ${formatDisplayDate(call.callDate)} no está habilitada para inscripciones.`,
      );
    }

    const standing = await loadStanding(context.studentCareerId, today);
    if (standing.approved.has(subject.studyPlanSubjectId)) {
      throw new AppError(
        409,
        EXAM_ENROLLMENT_ERROR_CODES.SUBJECT_ALREADY_APPROVED,
        `Ya tenés ${subjectName} aprobada, no necesitás rendirla.`,
      );
    }

    const missing = findMissingRequirements(call, standing);
    const ineligibility = checkAcademicConditions(call, standing, missing);
    if (ineligibility) {
      throw new AppError(
        409,
        EXAM_ENROLLMENT_ERROR_CODES[ineligibility.code],
        ineligibility.message,
        {
          missingRequirements: missing,
        },
      );
    }

    const studentStudyPlan = await repo.findStudentStudyPlan(
      context.studentCareerId,
      context.studyPlanId,
    );
    if (!studentStudyPlan)
      throw new Error(
        `Alumno ${context.studentCareerId} sin STUDENT_STUDY_PLAN para el plan ${context.studyPlanId}`,
      );

    const { studentCareerId } = context;
    let examEnrollmentId: number;
    try {
      examEnrollmentId = await courseEnrollmentRepository.runSerializable(
        async (tx) => {
          const upcoming = await repo.findUpcomingEnrollments(
            studentCareerId,
            today,
            tx,
          );

          if (upcoming.some((e) => e.examCall.examCallId === examCallId)) {
            throw new AppError(
              409,
              EXAM_ENROLLMENT_ERROR_CODES.ALREADY_ENROLLED,
              "Ya estás inscripto en esta mesa.",
            );
          }

          const sameSubject = upcoming.find(
            (e) =>
              e.examCall.studyPlanSubject.studyPlanSubjectId ===
              subject.studyPlanSubjectId,
          );
          if (sameSubject) {
            throw new AppError(
              409,
              EXAM_ENROLLMENT_ERROR_CODES.ALREADY_ENROLLED_IN_SUBJECT,
              `Ya estás inscripto a ${subjectName} en la mesa del ${formatDisplayDate(sameSubject.examCall.callDate)}. Si querés cambiar de llamado, primero cancelá esa inscripción.`,
            );
          }

          if (
            call.capacity !== null &&
            (await repo.countActiveEnrollments(examCallId, tx)) >= call.capacity
          ) {
            throw new AppError(
              409,
              EXAM_ENROLLMENT_ERROR_CODES.CALL_FULL,
              `La mesa de ${subjectName} del ${formatDisplayDate(call.callDate)} ya no tiene cupo disponible.`,
            );
          }

          // Si se había inscripto antes a esta misma mesa y canceló, se reactiva ese registro.
          const previous = await repo.findEnrollment(
            examCallId,
            studentCareerId,
            tx,
          );
          const saved = previous
            ? await repo.reactivateEnrollment(previous.examEnrollmentId, tx)
            : await repo.createEnrollment(
                examCallId,
                studentCareerId,
                studentStudyPlan.studentStudyPlanId,
                tx,
              );
          return saved.examEnrollmentId;
        },
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      mapConcurrencyError(error);
    }

    await auditService.record({
      userId: user.userId,
      action: AUDIT_ACTIONS.EXAM_ENROLLMENT_CREATED,
      entity: "EXAM_ENROLLMENT",
      entityId: String(examEnrollmentId),
      details: `Inscripción a final de ${subject.subject.subjectCode} - ${subjectName}, mesa del ${formatDisplayDate(call.callDate)} ${toTime(call.callDate)} (${call.examSession.examName})`,
      ipAddress,
    });

    await notificationsService.notify({
      userId: user.userId,
      title: "Inscripción a examen final confirmada",
      body: `Quedaste inscripto en ${subjectName} para el ${formatDisplayDate(call.callDate)} a las ${toTime(call.callDate)} (${call.examSession.examName}). Comprobante: ${enrollmentCode(examEnrollmentId)}.`,
      type: "importante",
      link: "/alumno/examenes",
    });

    const upcoming = await repo.findUpcomingEnrollments(studentCareerId, today);
    const created = upcoming.find(
      (e) => e.examEnrollmentId === examEnrollmentId,
    );
    if (!created)
      throw new Error(
        `Inscripción a examen ${examEnrollmentId} no encontrada luego de guardarla`,
      );
    return toEnrollmentDto(created, today);
  },

  async cancel(
    user: AuthUser,
    rawExamEnrollmentId: unknown,
    ipAddress: string | null,
  ): Promise<void> {
    const examEnrollmentId = Number(rawExamEnrollmentId);
    if (!Number.isInteger(examEnrollmentId) || examEnrollmentId <= 0) {
      throw new AppError(
        400,
        EXAM_ENROLLMENT_ERROR_CODES.INVALID_INPUT,
        "Inscripción inválida.",
      );
    }

    const enrollment = await repo.findEnrollmentById(examEnrollmentId);
    // Una inscripción de otro alumno se informa como inexistente.
    if (
      !enrollment ||
      enrollment.studentCareer.studentProfile.userId !== user.userId
    ) {
      throw new AppError(
        404,
        EXAM_ENROLLMENT_ERROR_CODES.ENROLLMENT_NOT_FOUND,
        "La inscripción no existe.",
      );
    }
    if (enrollment.examStatus !== EXAM_STATUS.INSCRIPTO) {
      throw new AppError(
        409,
        EXAM_ENROLLMENT_ERROR_CODES.ENROLLMENT_NOT_ACTIVE,
        "Esta inscripción ya no está vigente.",
      );
    }

    const { examSession, callDate, studyPlanSubject } = enrollment.examCall;
    if (!isWindowOpen(examSession, todayAsDate())) {
      throw new AppError(
        409,
        EXAM_ENROLLMENT_ERROR_CODES.EXAM_PERIOD_CLOSED,
        "No podés darte de baja de la mesa porque el período de inscripción ya cerró.",
      );
    }

    await repo.cancelEnrollment(examEnrollmentId);

    await auditService.record({
      userId: user.userId,
      action: AUDIT_ACTIONS.EXAM_ENROLLMENT_CANCELLED,
      entity: "EXAM_ENROLLMENT",
      entityId: String(examEnrollmentId),
      details: `Baja de inscripción a final de ${studyPlanSubject.subject.subjectCode} - ${studyPlanSubject.subject.subjectName}, mesa del ${formatDisplayDate(callDate)}`,
      ipAddress,
    });

    await notificationsService.notify({
      userId: user.userId,
      title: "Baja de examen final confirmada",
      body: `Cancelaste tu inscripción a la mesa de ${studyPlanSubject.subject.subjectName} del ${formatDisplayDate(callDate)}.`,
      type: "info",
      link: "/alumno/examenes",
    });
  },
};
