import { AppError } from "../lib/AppError.js";
import {
  attendancePercent,
  attendanceWeight,
  attendedWeight,
  VALID_ATTENDANCE_STATUSES,
} from "../lib/attendance.js";
import { computeCourseCondition, type CourseCondition } from "../lib/courseCondition.js";
import { teacherRepository } from "../repositories/teacher.repository.js";

import {
  ENROLLMENT_STATUS,
  EXAM_CALL_STATUS,
  EXAM_STATUS,
  FINAL_EXAM_PASSING_GRADE,
  MIN_ATTENDANCE_PERCENT,
} from "../types/academic.js";

const RISK_THRESHOLD_PERCENT = 80;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Estados que la asistencia no debe pisar: los cierra RF-07 (notas) o el alumno al cancelar (RF-04). */
const STATUSES_NOT_RECALCULATED_BY_ATTENDANCE = new Set<string>([
  ENROLLMENT_STATUS.APROBADA,
  ENROLLMENT_STATUS.DESAPROBADA,
  ENROLLMENT_STATUS.CANCELADA,
]);

const ASSESSMENT_TYPES = new Set(["PARCIAL", "RECUPERATORIO", "TP"]);

const COURSE_CLOSED_MESSAGE =
  "La cursada ya está cerrada. Para modificarla solicitá la reapertura al Administrador/Director.";

function attendancePercentOf(
  attendances: { attendanceStatus: string }[],
  totalSessions: number,
): number {
  return attendancePercent(attendedWeight(attendances.map((a) => a.attendanceStatus)), totalSessions);
}

type GradesData = Awaited<ReturnType<typeof teacherRepository.findCommissionGradesData>>;

/** RF-07: condición que le corresponde a cada inscripción vigente según los criterios de la materia. */
function projectCourseConditions(
  data: GradesData,
  criteria: { regularGrade: number; promotionGrade: number | null },
): Map<number, CourseCondition> {
  const parciales = data.assessments.filter((a) => a.assessmentType === "PARCIAL");
  const recoveryOf = new Map(
    data.assessments
      .filter((a) => a.assessmentType === "RECUPERATORIO" && a.recoversAssessmentId !== null)
      .map((a) => [a.recoversAssessmentId!, a]),
  );
  const scoreOf = (a: GradesData["assessments"][number], enrollmentId: number) => {
    const g = a.assessmentGrades.find((x) => x.courseEnrollmentId === enrollmentId);
    return g ? Number(g.gradeScore) : null;
  };

  const result = new Map<number, CourseCondition>();
  for (const enr of data.enrollments) {
    if (enr.enrollmentStatus === ENROLLMENT_STATUS.CANCELADA) continue;
    result.set(
      enr.courseEnrollmentId,
      computeCourseCondition({
        attendancePercent: attendancePercentOf(enr.attendances, data.totalSessions),
        regularGrade: criteria.regularGrade,
        promotionGrade: criteria.promotionGrade,
        parciales: parciales.map((p) => {
          const rec = recoveryOf.get(p.assessmentId);
          return {
            maxScore: Number(p.maxScore),
            score: scoreOf(p, enr.courseEnrollmentId),
            recoveryMaxScore: rec ? Number(rec.maxScore) : null,
            recoveryScore: rec ? scoreOf(rec, enr.courseEnrollmentId) : null,
          };
        }),
      }),
    );
  }
  return result;
}

function criteriaOf(sps: { regularGrade: unknown; promotionGrade: unknown }) {
  return {
    regularGrade: Number(sps.regularGrade),
    promotionGrade: sps.promotionGrade === null ? null : Number(sps.promotionGrade),
  };
}

function getCondition(percentage: number): "REGULAR" | "EN_RIESGO" | "LIBRE" {
  if (percentage < MIN_ATTENDANCE_PERCENT) return "LIBRE";
  if (percentage < RISK_THRESHOLD_PERCENT) return "EN_RIESGO";
  return "REGULAR";
}

export const teacherService = {
  async getMyCommissions(user: { userId: number }) {
    const profile = await teacherRepository.findTeacherProfileByUserId(
      user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "TEACHER_PROFILE_NOT_FOUND",
        "El usuario no tiene perfil docente.",
      );
    }

    const assignments = await teacherRepository.findAssignedCommissions(
      profile.teacherId,
    );

    return assignments.map((a) => ({
      id: String(a.courseOffering.courseOfferingId),
      subjectName: a.courseOffering.studyPlanSubject.subject.subjectName,
      subjectCode: a.courseOffering.studyPlanSubject.subject.subjectCode,
      commissionCode: a.courseOffering.commission,
      periodStart: toIsoDate(a.courseOffering.academicPeriod.periodStartDate),
      periodEnd: toIsoDate(a.courseOffering.academicPeriod.periodEndDate),
      enrolledCount: a.courseOffering._count.courseEnrollments,
    }));
  },

  async getCommissionStudents(
    user: { userId: number },
    rawCommissionId: unknown,
  ) {
    const courseOfferingId = Number(rawCommissionId);
    if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0) {
      throw new AppError(
        400,
        "INVALID_COMMISSION_ID",
        "El ID de comisión no es válido.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const assignment = await teacherRepository.findTeacherAssignment(
      profile.teacherId,
      courseOfferingId,
    );
    if (!assignment) {
      throw new AppError(
        403,
        "NOT_ASSIGNED",
        "Acceso denegado: no estás asignado a esta comisión.",
      );
    }

    const { enrollments, totalSessions, assessments } =
      await teacherRepository.findCommissionStudents(courseOfferingId);

    const students = enrollments.map((enr) => {
      const sp = enr.studentCareer.studentProfile;
      const attendancePercentage = attendancePercentOf(enr.attendances, totalSessions);

      return {
        enrollmentId: String(enr.courseEnrollmentId),
        studentId: String(sp.studentId),
        legajo: sp.legajo,
        fullName: `${sp.user.firstName} ${sp.user.lastName}`,
        email: sp.user.email,
        enrollmentStatus: enr.enrollmentStatus,
        attendancePercentage,
        grades: assessments.map((a) => {
          const g = a.assessmentGrades.find(
            (x) => x.courseEnrollmentId === enr.courseEnrollmentId,
          );
          return {
            assessmentId: String(a.assessmentId),
            score: g ? Number(g.gradeScore) : null,
          };
        }),
        observations: enr.studentObservations.map((obs) => ({
          id: String(obs.observationId),
          text: obs.observationText,
          createdAt: obs.createdAt.toISOString(),
          authorName: `${obs.teacherProfile.user.firstName} ${obs.teacherProfile.user.lastName}`,
        })),
      };
    });

    return {
      commission: {
        id: String(courseOfferingId),
        subjectName:
          assignment.courseOffering.studyPlanSubject.subject.subjectName,
        commissionCode: assignment.courseOffering.commission,
      },
      assessments: assessments.map((a) => ({
        id: String(a.assessmentId),
        name: a.assessmentName,
        type: a.assessmentType,
        maxScore: Number(a.maxScore),
      })),
      students,
    };
  },

  async addStudentObservation(params: {
    user: { userId: number };
    ipAddress: string | null;
    rawCommissionId: unknown;
    rawEnrollmentId: unknown;
    text: unknown;
  }) {
    const courseOfferingId = Number(params.rawCommissionId);
    const courseEnrollmentId = Number(params.rawEnrollmentId);
    if (
      !Number.isInteger(courseOfferingId) ||
      !Number.isInteger(courseEnrollmentId)
    ) {
      throw new AppError(
        400,
        "INVALID_ID",
        "Los identificadores enviados no son válidos.",
      );
    }

    const text = typeof params.text === "string" ? params.text.trim() : "";
    if (!text) {
      throw new AppError(
        400,
        "EMPTY_OBSERVATION",
        "La observación no puede estar vacía.",
      );
    }
    if (text.length > 1000) {
      throw new AppError(
        400,
        "OBSERVATION_TOO_LONG",
        "La observación no puede superar los 1000 caracteres.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      params.user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const assignment = await teacherRepository.findTeacherAssignment(
      profile.teacherId,
      courseOfferingId,
    );
    if (!assignment) {
      throw new AppError(
        403,
        "NOT_ASSIGNED",
        "Acceso denegado: no estás asignado a esta comisión.",
      );
    }

    const enrollment = await teacherRepository.findEnrollmentInCommission(
      courseEnrollmentId,
      courseOfferingId,
    );
    if (!enrollment) {
      throw new AppError(
        404,
        "ENROLLMENT_NOT_FOUND",
        "El alumno no pertenece a esta comisión.",
      );
    }

    const sp = enrollment.studentCareer.studentProfile;
    const created = await teacherRepository.createStudentObservation({
      courseEnrollmentId,
      teacherId: profile.teacherId,
      observationText: text,
      audit: {
        userId: params.user.userId,
        details: `Comisión ${assignment.courseOffering.commission} - Legajo ${sp.legajo}`,
        ipAddress: params.ipAddress,
      },
    });

    return {
      id: String(created.observationId),
      text: created.observationText,
      createdAt: created.createdAt.toISOString(),
      authorName: `${created.teacherProfile.user.firstName} ${created.teacherProfile.user.lastName}`,
    };
  },

  async getAttendanceForDate(
    user: { userId: number },
    rawCommissionId: unknown,
    rawDate: unknown,
  ) {
    const courseOfferingId = Number(rawCommissionId);
    if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0) {
      throw new AppError(
        400,
        "INVALID_COMMISSION_ID",
        "El ID de comisión no es válido.",
      );
    }

    const dateStr = String(rawDate ?? "");
    const sessionDate = new Date(`${dateStr}T00:00:00.000Z`);
    if (!dateStr || Number.isNaN(sessionDate.getTime())) {
      throw new AppError(
        400,
        "INVALID_DATE",
        "La fecha debe tener formato YYYY-MM-DD.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const assignment = await teacherRepository.findTeacherAssignment(
      profile.teacherId,
      courseOfferingId,
    );
    if (!assignment) {
      throw new AppError(
        403,
        "NOT_ASSIGNED",
        "Acceso denegado: no estás asignado a esta comisión.",
      );
    }

    const { enrollments, sessions, existingSession } =
      await teacherRepository.findCommissionAttendanceData(
        courseOfferingId,
        sessionDate,
      );

    const otherSessionsCount = sessions.filter(
      (s) =>
        !existingSession || s.classSessionId !== existingSession.classSessionId,
    ).length;

    const students = enrollments.map((enr) => {
      const sp = enr.studentCareer.studentProfile;
      const previousAttendances = enr.attendances.filter(
        (att) =>
          !existingSession ||
          att.classSessionId !== existingSession.classSessionId,
      );
      // Asistencia ponderada: una tardanza suma 0,5.
      const previousAttended = attendedWeight(previousAttendances.map((att) => att.attendanceStatus));

      const currentStatus = existingSession
        ? (enr.attendances.find(
            (a) => a.classSessionId === existingSession.classSessionId,
          )?.attendanceStatus ?? "")
        : "";

      return {
        enrollmentId: String(enr.courseEnrollmentId),
        studentId: String(sp.studentId),
        legajo: sp.legajo,
        fullName: `${sp.user.firstName} ${sp.user.lastName}`,
        previousTotalClasses: otherSessionsCount,
        previousAttendedClasses: previousAttended,
        currentStatus,
      };
    });

    return {
      commission: {
        id: String(courseOfferingId),
        subjectName:
          assignment.courseOffering.studyPlanSubject.subject.subjectName,
        commissionCode: assignment.courseOffering.commission,
        periodStart: toIsoDate(
          assignment.courseOffering.academicPeriod.periodStartDate,
        ),
        periodEnd: toIsoDate(
          assignment.courseOffering.academicPeriod.periodEndDate,
        ),
      },
      existingSession: existingSession
        ? {
            classSessionId: existingSession.classSessionId,
            date: toIsoDate(existingSession.sessionDate),
            topic: existingSession.sessionTopic ?? "",
          }
        : null,
      students,
    };
  },

  async saveAttendance(params: {
    user: { userId: number };
    ipAddress: string | null;
    rawCommissionId: unknown;
    date: unknown;
    topic: unknown;
    allowOverwrite: unknown;
    records: unknown;
  }) {
    const courseOfferingId = Number(params.rawCommissionId);
    if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0) {
      throw new AppError(
        400,
        "INVALID_COMMISSION_ID",
        "El ID de comisión no es válido.",
      );
    }

    const dateStr = String(params.date ?? "");
    const sessionDate = new Date(`${dateStr}T00:00:00.000Z`);
    if (!dateStr || Number.isNaN(sessionDate.getTime())) {
      throw new AppError(
        400,
        "INVALID_DATE",
        "La fecha debe tener formato YYYY-MM-DD.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      params.user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const assignment = await teacherRepository.findTeacherAssignment(
      profile.teacherId,
      courseOfferingId,
    );
    if (!assignment) {
      throw new AppError(
        403,
        "NOT_ASSIGNED",
        "Acceso denegado: no estás asignado a esta comisión.",
      );
    }

    if (assignment.courseOffering.gradesClosedAt) {
      throw new AppError(409, "COURSE_CLOSED", COURSE_CLOSED_MESSAGE);
    }

    const periodStart = toIsoDate(
      assignment.courseOffering.academicPeriod.periodStartDate,
    );
    const periodEnd = toIsoDate(
      assignment.courseOffering.academicPeriod.periodEndDate,
    );
    if (dateStr < periodStart || dateStr > periodEnd) {
      throw new AppError(
        400,
        "DATE_OUT_OF_PERIOD",
        `Fecha fuera del período de cursada vigente (${periodStart} al ${periodEnd}).`,
      );
    }

    const { enrollments, sessions, existingSession } =
      await teacherRepository.findCommissionAttendanceData(
        courseOfferingId,
        sessionDate,
      );

    if (existingSession && !Boolean(params.allowOverwrite)) {
      throw new AppError(
        409,
        "ATTENDANCE_ALREADY_EXISTS",
        "Ya existe un registro de asistencia para esta fecha. Confirmá la edición para sobrescribirlo.",
      );
    }

    const parsedRecords = Array.isArray(params.records)
      ? params.records.map(
          (r: { enrollmentId?: unknown; status?: unknown }) => ({
            enrollmentId: Number(r.enrollmentId),
            status: String(r.status ?? ""),
          }),
        )
      : [];

    const recordMap = new Map<number, string>();
    for (const r of parsedRecords) {
      if (!VALID_ATTENDANCE_STATUSES.has(r.status)) {
        throw new AppError(
          400,
          "INVALID_STATUS",
          `Estado de asistencia inválido: ${r.status}`,
        );
      }
      recordMap.set(r.enrollmentId, r.status);
    }

    if (recordMap.size !== enrollments.length) {
      throw new AppError(
        400,
        "INCOMPLETE_ATTENDANCE",
        "Registro incompleto: debés indicar el estado de todos los alumnos inscriptos.",
      );
    }

    const totalClassesAfterSave = existingSession
      ? sessions.length
      : sessions.length + 1;
    const enrollmentUpdates: {
      courseEnrollmentId: number;
      enrollmentStatus: string;
    }[] = [];

    for (const enr of enrollments) {
      const newStatus = recordMap.get(enr.courseEnrollmentId);
      if (!newStatus) {
        throw new AppError(
          400,
          "INCOMPLETE_ATTENDANCE",
          "Falta completar el estado de un alumno.",
        );
      }

      const prevAttended = attendedWeight(
        enr.attendances
          .filter((a) => !existingSession || a.classSessionId !== existingSession.classSessionId)
          .map((a) => a.attendanceStatus),
      );

      const pct = attendancePercent(prevAttended + attendanceWeight(newStatus), totalClassesAfterSave);

      if (STATUSES_NOT_RECALCULATED_BY_ATTENDANCE.has(enr.enrollmentStatus)) {
        continue;
      }

      enrollmentUpdates.push({
        courseEnrollmentId: enr.courseEnrollmentId,
        enrollmentStatus: getCondition(pct),
      });
    }

    const session = await teacherRepository.saveClassAttendance({
      courseOfferingId,
      sessionDate,
      sessionTopic:
        typeof params.topic === "string" && params.topic.trim()
          ? params.topic.trim()
          : null,
      records: parsedRecords.map((r) => ({
        courseEnrollmentId: r.enrollmentId,
        attendanceStatus: r.status,
      })),
      enrollmentUpdates,
      audit: {
        userId: params.user.userId,
        action: existingSession ? "EDICION_ASISTENCIA" : "ALTA_ASISTENCIA",
        details: `Comisión ${assignment.courseOffering.commission} - Fecha ${dateStr}`,
        ipAddress: params.ipAddress,
      },
    });

    return {
      classSessionId: session.classSessionId,
      date: dateStr,
      updatedStudents: enrollmentUpdates.length,
    };
  },

  async getCommissionGrades(
    user: { userId: number },
    rawCommissionId: unknown,
  ) {
    const courseOfferingId = Number(rawCommissionId);
    if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0) {
      throw new AppError(
        400,
        "INVALID_COMMISSION_ID",
        "El ID de comisión no es válido.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const assignment = await teacherRepository.findTeacherAssignment(
      profile.teacherId,
      courseOfferingId,
    );
    if (!assignment) {
      throw new AppError(
        403,
        "NOT_ASSIGNED",
        "Acceso denegado: no estás asignado a esta comisión.",
      );
    }

    const data = await teacherRepository.findCommissionGradesData(courseOfferingId);
    const { assessments, enrollments, totalSessions } = data;
    const criteria = criteriaOf(assignment.courseOffering.studyPlanSubject);
    const projected = projectCourseConditions(data, criteria);
    const closedAt = assignment.courseOffering.gradesClosedAt;

    return {
      commission: {
        id: String(courseOfferingId),
        subjectName:
          assignment.courseOffering.studyPlanSubject.subject.subjectName,
        commissionCode: assignment.courseOffering.commission,
        criteria,
        closedAt: closedAt ? closedAt.toISOString() : null,
      },
      students: enrollments.map((enr) => ({
        enrollmentId: String(enr.courseEnrollmentId),
        legajo: enr.studentCareer.studentProfile.legajo,
        fullName: `${enr.studentCareer.studentProfile.user.firstName} ${enr.studentCareer.studentProfile.user.lastName}`,
        enrollmentStatus: enr.enrollmentStatus,
        attendancePercentage: attendancePercentOf(enr.attendances, totalSessions),
        projectedCondition: projected.get(enr.courseEnrollmentId) ?? null,
      })),
      assessments: assessments.map((a) => ({
        id: String(a.assessmentId),
        name: a.assessmentName,
        type: a.assessmentType,
        date: a.assessmentDate
          ? a.assessmentDate.toISOString().slice(0, 10)
          : null,
        maxScore: Number(a.maxScore),
        isClosed: a.isClosed,
        recoversAssessmentId:
          a.recoversAssessmentId === null ? null : String(a.recoversAssessmentId),
        grades: a.assessmentGrades.map((g) => ({
          enrollmentId: String(g.courseEnrollmentId),
          score: Number(g.gradeScore),
        })),
      })),
    };
  },

  async createAssessment(params: {
    user: { userId: number };
    ipAddress: string | null;
    rawCommissionId: unknown;
    name: unknown;
    type: unknown;
    date: unknown;
    maxScore: unknown;
    recoversAssessmentId: unknown;
  }) {
    const courseOfferingId = Number(params.rawCommissionId);
    if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0) {
      throw new AppError(
        400,
        "INVALID_COMMISSION_ID",
        "El ID de comisión no es válido.",
      );
    }

    const name = typeof params.name === "string" ? params.name.trim() : "";
    const type =
      typeof params.type === "string" ? params.type.trim() : "PARCIAL";
    const maxScore = Number(params.maxScore ?? 10);

    if (!name) {
      throw new AppError(
        400,
        "INVALID_NAME",
        "El nombre de la evaluación es obligatorio.",
      );
    }
    if (!ASSESSMENT_TYPES.has(type)) {
      throw new AppError(
        400,
        "INVALID_TYPE",
        "El tipo de evaluación debe ser Parcial, Recuperatorio o Trabajo Práctico.",
      );
    }
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 100) {
      throw new AppError(
        400,
        "INVALID_MAX_SCORE",
        "La nota máxima debe estar entre 1 y 100.",
      );
    }

    const assessmentDate =
      typeof params.date === "string" && params.date.trim()
        ? new Date(`${params.date.trim()}T00:00:00.000Z`)
        : null;

    const profile = await teacherRepository.findTeacherProfileByUserId(
      params.user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const assignment = await teacherRepository.findTeacherAssignment(
      profile.teacherId,
      courseOfferingId,
    );
    if (!assignment) {
      throw new AppError(
        403,
        "NOT_ASSIGNED",
        "Acceso denegado: no estás asignado a esta comisión.",
      );
    }

    if (assignment.courseOffering.gradesClosedAt) {
      throw new AppError(409, "COURSE_CLOSED", COURSE_CLOSED_MESSAGE);
    }

    let recoversAssessmentId: number | null = null;
    if (type === "RECUPERATORIO") {
      recoversAssessmentId = Number(params.recoversAssessmentId);
      const { assessments } =
        await teacherRepository.findCommissionGradesData(courseOfferingId);
      const target = assessments.find(
        (a) => a.assessmentId === recoversAssessmentId && a.assessmentType === "PARCIAL",
      );
      if (!target) {
        throw new AppError(
          400,
          "INVALID_RECOVERED_ASSESSMENT",
          "Elegí el parcial de esta comisión que recupera el recuperatorio.",
        );
      }
      if (assessments.some((a) => a.recoversAssessmentId === recoversAssessmentId)) {
        throw new AppError(
          409,
          "RECOVERY_ALREADY_EXISTS",
          `El parcial "${target.assessmentName}" ya tiene un recuperatorio.`,
        );
      }
    }

    const created = await teacherRepository.createAssessment({
      courseOfferingId,
      assessmentName: name,
      assessmentType: type,
      assessmentDate,
      maxScore,
      recoversAssessmentId,
      audit: {
        userId: params.user.userId,
        details: `Comisión ${assignment.courseOffering.commission} - ${name} (${type})`,
        ipAddress: params.ipAddress,
      },
    });

    return {
      id: String(created.assessmentId),
      name: created.assessmentName,
      type: created.assessmentType,
      date: created.assessmentDate
        ? created.assessmentDate.toISOString().slice(0, 10)
        : null,
      maxScore: Number(created.maxScore),
      isClosed: created.isClosed,
      recoversAssessmentId:
        created.recoversAssessmentId === null ? null : String(created.recoversAssessmentId),
      grades: [],
    };
  },

  async saveAssessmentGrades(params: {
    user: { userId: number };
    ipAddress: string | null;
    rawCommissionId: unknown;
    rawAssessmentId: unknown;
    grades: unknown;
  }) {
    const courseOfferingId = Number(params.rawCommissionId);
    const assessmentId = Number(params.rawAssessmentId);
    if (
      !Number.isInteger(courseOfferingId) ||
      !Number.isInteger(assessmentId)
    ) {
      throw new AppError(
        400,
        "INVALID_ID",
        "Los identificadores enviados no son válidos.",
      );
    }

    if (!Array.isArray(params.grades) || params.grades.length === 0) {
      throw new AppError(
        400,
        "EMPTY_GRADES",
        "Debés enviar al menos una calificación.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      params.user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const assignment = await teacherRepository.findTeacherAssignment(
      profile.teacherId,
      courseOfferingId,
    );
    if (!assignment) {
      throw new AppError(
        403,
        "NOT_ASSIGNED",
        "Acceso denegado: no estás asignado a esta comisión.",
      );
    }

    const assessment = await teacherRepository.findAssessmentInCommission(
      assessmentId,
      courseOfferingId,
    );
    if (!assessment) {
      throw new AppError(
        404,
        "ASSESSMENT_NOT_FOUND",
        "La evaluación no pertenece a esta comisión.",
      );
    }
    if (assessment.isClosed) {
      throw new AppError(
        409,
        "ASSESSMENT_CLOSED",
        "El acta de esta evaluación ya está cerrada y no admite modificaciones.",
      );
    }

    const maxScore = Number(assessment.maxScore);
    const parsedGrades: { courseEnrollmentId: number; score: number }[] = [];

    for (const item of params.grades) {
      const record = item as Record<string, unknown>;
      const courseEnrollmentId = Number(record["enrollmentId"]);
      const score = Number(record["score"]);

      if (!Number.isInteger(courseEnrollmentId) || !Number.isFinite(score)) {
        throw new AppError(
          400,
          "INVALID_GRADE_ITEM",
          "Formato de calificación inválido.",
        );
      }
      if (score < 0 || score > maxScore) {
        throw new AppError(
          400,
          "SCORE_OUT_OF_RANGE",
          `Las notas deben estar entre 0 y ${maxScore}.`,
        );
      }

      parsedGrades.push({ courseEnrollmentId, score });
    }

    await teacherRepository.saveAssessmentGrades({
      assessmentId,
      grades: parsedGrades,
      audit: {
        userId: params.user.userId,
        details: `Comisión ${assignment.courseOffering.commission} - ${assessment.assessmentName} (${parsedGrades.length} notas)`,
        ipAddress: params.ipAddress,
      },
    });

    return { savedCount: parsedGrades.length };
  },

  async closeAssessment(params: {
    user: { userId: number };
    ipAddress: string | null;
    rawCommissionId: unknown;
    rawAssessmentId: unknown;
  }) {
    const courseOfferingId = Number(params.rawCommissionId);
    const assessmentId = Number(params.rawAssessmentId);
    if (
      !Number.isInteger(courseOfferingId) ||
      !Number.isInteger(assessmentId)
    ) {
      throw new AppError(
        400,
        "INVALID_ID",
        "Los identificadores enviados no son válidos.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      params.user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const assignment = await teacherRepository.findTeacherAssignment(
      profile.teacherId,
      courseOfferingId,
    );
    if (!assignment) {
      throw new AppError(
        403,
        "NOT_ASSIGNED",
        "Acceso denegado: no estás asignado a esta comisión.",
      );
    }

    const assessment = await teacherRepository.findAssessmentInCommission(
      assessmentId,
      courseOfferingId,
    );
    if (!assessment) {
      throw new AppError(
        404,
        "ASSESSMENT_NOT_FOUND",
        "La evaluación no pertenece a esta comisión.",
      );
    }
    if (assessment.isClosed) {
      throw new AppError(
        409,
        "ALREADY_CLOSED",
        "Esta evaluación ya se encuentra cerrada.",
      );
    }

    await teacherRepository.closeAssessment({
      assessmentId,
      audit: {
        userId: params.user.userId,
        details: `Cierre de acta: ${assignment.courseOffering.commission} - ${assessment.assessmentName}`,
        ipAddress: params.ipAddress,
      },
    });

    return { id: String(assessmentId), isClosed: true };
  },

  /** RF-07: calcula y guarda la condición final de cada alumno y cierra la cursada. */
  async closeCourse(params: {
    user: { userId: number };
    ipAddress: string | null;
    rawCommissionId: unknown;
  }) {
    const courseOfferingId = Number(params.rawCommissionId);
    if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0) {
      throw new AppError(
        400,
        "INVALID_COMMISSION_ID",
        "El ID de comisión no es válido.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      params.user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const assignment = await teacherRepository.findTeacherAssignment(
      profile.teacherId,
      courseOfferingId,
    );
    if (!assignment) {
      throw new AppError(
        403,
        "NOT_ASSIGNED",
        "Acceso denegado: no estás asignado a esta comisión.",
      );
    }
    if (assignment.courseOffering.gradesClosedAt) {
      throw new AppError(409, "COURSE_CLOSED", COURSE_CLOSED_MESSAGE);
    }

    const data = await teacherRepository.findCommissionGradesData(courseOfferingId);
    if (!data.assessments.some((a) => a.assessmentType === "PARCIAL")) {
      throw new AppError(
        409,
        "NO_PARCIALES",
        "No se puede cerrar la cursada: no hay parciales cargados.",
      );
    }

    const projected = projectCourseConditions(
      data,
      criteriaOf(assignment.courseOffering.studyPlanSubject),
    );
    const conditions = [...projected].map(([courseEnrollmentId, enrollmentStatus]) => ({
      courseEnrollmentId,
      enrollmentStatus,
    }));

    await teacherRepository.closeCourse({
      courseOfferingId,
      conditions,
      audit: {
        userId: params.user.userId,
        details: `Cierre de cursada: comisión ${assignment.courseOffering.commission} - ${conditions.length} alumnos`,
        ipAddress: params.ipAddress,
      },
    });

    return { closedCount: conditions.length };
  },

  async getTeacherExamCalls(user: { userId: number }) {
    const profile = await teacherRepository.findTeacherProfileByUserId(
      user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const calls = await teacherRepository.findTeacherExamCalls(
      profile.teacherId,
    );

    return calls.map((c) => ({
      id: String(c.examCallId),
      subjectCode: c.studyPlanSubject.subject.subjectCode,
      subjectName: c.studyPlanSubject.subject.subjectName,
      sessionName: c.examSession.examName,
      callDate: c.callDate.toISOString().slice(0, 10),
      classroom: c.classroom,
      callStatus: c.callStatus,
      enrolledCount: c.examEnrollments.length,
    }));
  },

  async getExamCallGrades(user: { userId: number }, rawExamCallId: unknown) {
    const examCallId = Number(rawExamCallId);
    if (!Number.isInteger(examCallId) || examCallId <= 0) {
      throw new AppError(
        400,
        "INVALID_EXAM_CALL_ID",
        "El ID de mesa de examen no es válido.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const call = await teacherRepository.findTeacherExamCallById(
      examCallId,
      profile.teacherId,
    );
    if (!call) {
      throw new AppError(
        404,
        "EXAM_CALL_NOT_FOUND",
        "Mesa de examen no encontrada o no asignada.",
      );
    }

    return {
      examCall: {
        id: String(call.examCallId),
        subjectCode: call.studyPlanSubject.subject.subjectCode,
        subjectName: call.studyPlanSubject.subject.subjectName,
        sessionName: call.examSession.examName,
        callDate: call.callDate.toISOString().slice(0, 10),
        classroom: call.classroom,
        callStatus: call.callStatus,
      },
      students: call.examEnrollments.map((enr) => ({
        examEnrollmentId: String(enr.examEnrollmentId),
        legajo: enr.studentCareer.studentProfile.legajo,
        fullName: `${enr.studentCareer.studentProfile.user.firstName} ${enr.studentCareer.studentProfile.user.lastName}`,
        examGrade: enr.examGrade !== null ? Number(enr.examGrade) : null,
        examStatus: enr.examStatus,
      })),
    };
  },

  async saveExamCallGrades(params: {
    user: { userId: number };
    ipAddress: string | null;
    rawExamCallId: unknown;
    grades: unknown;
  }) {
    const examCallId = Number(params.rawExamCallId);
    if (!Number.isInteger(examCallId) || examCallId <= 0) {
      throw new AppError(
        400,
        "INVALID_EXAM_CALL_ID",
        "El ID de mesa de examen no es válido.",
      );
    }

    if (!Array.isArray(params.grades) || params.grades.length === 0) {
      throw new AppError(
        400,
        "EMPTY_GRADES",
        "Debés enviar al menos una calificación.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      params.user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const call = await teacherRepository.findTeacherExamCallById(
      examCallId,
      profile.teacherId,
    );
    if (!call) {
      throw new AppError(
        404,
        "EXAM_CALL_NOT_FOUND",
        "Mesa de examen no encontrada o no asignada.",
      );
    }
    if (call.callStatus === EXAM_CALL_STATUS.CERRADA) {
      throw new AppError(
        409,
        "EXAM_CALL_CLOSED",
        "El acta de esta mesa ya está cerrada.",
      );
    }

    const validIds = new Set(
      call.examEnrollments.map((e) => e.examEnrollmentId),
    );
    const parsedGrades: {
      examEnrollmentId: number;
      examGrade: number;
      examStatus: string;
    }[] = [];

    for (const item of params.grades) {
      const record = item as Record<string, unknown>;
      const examEnrollmentId = Number(record["examEnrollmentId"]);
      const examGrade = Number(record["examGrade"]);

      if (!validIds.has(examEnrollmentId) || !Number.isFinite(examGrade)) {
        throw new AppError(
          400,
          "INVALID_GRADE_ITEM",
          "Datos de calificación inválidos.",
        );
      }
      if (examGrade < 0 || examGrade > 10) {
        throw new AppError(
          400,
          "SCORE_OUT_OF_RANGE",
          "Las notas de final deben estar entre 0 y 10.",
        );
      }

      const examStatus =
        examGrade >= FINAL_EXAM_PASSING_GRADE
          ? EXAM_STATUS.APROBADO
          : EXAM_STATUS.DESAPROBADO;

      parsedGrades.push({ examEnrollmentId, examGrade, examStatus });
    }

    await teacherRepository.saveExamCallGrades({
      examCallId,
      grades: parsedGrades,
      audit: {
        userId: params.user.userId,
        details: `Mesa ${call.studyPlanSubject.subject.subjectCode} (${call.examSession.examName}) - ${parsedGrades.length} notas`,
        ipAddress: params.ipAddress,
      },
    });

    return { savedCount: parsedGrades.length };
  },

  async closeExamCall(params: {
    user: { userId: number };
    ipAddress: string | null;
    rawExamCallId: unknown;
  }) {
    const examCallId = Number(params.rawExamCallId);
    if (!Number.isInteger(examCallId) || examCallId <= 0) {
      throw new AppError(
        400,
        "INVALID_EXAM_CALL_ID",
        "El ID de mesa de examen no es válido.",
      );
    }

    const profile = await teacherRepository.findTeacherProfileByUserId(
      params.user.userId,
    );
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil docente no encontrado.",
      );
    }

    const call = await teacherRepository.findTeacherExamCallById(
      examCallId,
      profile.teacherId,
    );
    if (!call) {
      throw new AppError(
        404,
        "EXAM_CALL_NOT_FOUND",
        "Mesa de examen no encontrada o no asignada.",
      );
    }
    if (call.callStatus === EXAM_CALL_STATUS.CERRADA) {
      throw new AppError(
        409,
        "ALREADY_CLOSED",
        "Esta mesa de examen ya está cerrada.",
      );
    }

    await teacherRepository.closeExamCall({
      examCallId,
      audit: {
        userId: params.user.userId,
        details: `Cierre de mesa: ${call.studyPlanSubject.subject.subjectCode} (${call.examSession.examName})`,
        ipAddress: params.ipAddress,
      },
    });

    return { id: String(examCallId), callStatus: EXAM_CALL_STATUS.CERRADA };
  },
};
