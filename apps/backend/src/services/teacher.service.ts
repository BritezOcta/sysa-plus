import { AppError } from "../lib/AppError.js";
import { teacherRepository } from "../repositories/teacher.repository.js";

const VALID_STATUSES = new Set(["PRESENTE", "AUSENTE", "JUSTIFICADO"]);
const MIN_REGULAR_PERCENT = 75;
const RISK_THRESHOLD_PERCENT = 80;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getCondition(percentage: number): "REGULAR" | "EN_RIESGO" | "LIBRE" {
  if (percentage < MIN_REGULAR_PERCENT) return "LIBRE";
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
      const previousAttended = previousAttendances.filter(
        (att) =>
          att.attendanceStatus === "PRESENTE" ||
          att.attendanceStatus === "JUSTIFICADO",
      ).length;

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
      if (!VALID_STATUSES.has(r.status)) {
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

      const prevAttended = enr.attendances.filter(
        (a) =>
          (!existingSession ||
            a.classSessionId !== existingSession.classSessionId) &&
          (a.attendanceStatus === "PRESENTE" ||
            a.attendanceStatus === "JUSTIFICADO"),
      ).length;

      const totalAttended =
        prevAttended +
        (newStatus === "PRESENTE" || newStatus === "JUSTIFICADO" ? 1 : 0);
      const pct = Math.round((totalAttended / totalClassesAfterSave) * 100);

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
};
