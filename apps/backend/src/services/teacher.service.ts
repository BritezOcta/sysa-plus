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

    const { enrollments, totalSessions } =
      await teacherRepository.findCommissionStudents(courseOfferingId);

    const students = enrollments.map((enr) => {
      const sp = enr.studentCareer.studentProfile;
      const attendedCount = enr.attendances.filter(
        (a) =>
          a.attendanceStatus === "PRESENTE" ||
          a.attendanceStatus === "JUSTIFICADO",
      ).length;
      const attendancePercentage =
        totalSessions === 0
          ? 100
          : Math.round((attendedCount / totalSessions) * 100);

      return {
        enrollmentId: String(enr.courseEnrollmentId),
        studentId: String(sp.studentId),
        legajo: sp.legajo,
        fullName: `${sp.user.firstName} ${sp.user.lastName}`,
        email: sp.user.email,
        enrollmentStatus: enr.enrollmentStatus,
        attendancePercentage,
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

    const { assessments, enrollments } =
      await teacherRepository.findCommissionGradesData(courseOfferingId);

    return {
      commission: {
        id: String(courseOfferingId),
        subjectName:
          assignment.courseOffering.studyPlanSubject.subject.subjectName,
        commissionCode: assignment.courseOffering.commission,
      },
      students: enrollments.map((enr) => ({
        enrollmentId: String(enr.courseEnrollmentId),
        legajo: enr.studentCareer.studentProfile.legajo,
        fullName: `${enr.studentCareer.studentProfile.user.firstName} ${enr.studentCareer.studentProfile.user.lastName}`,
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

    const created = await teacherRepository.createAssessment({
      courseOfferingId,
      assessmentName: name,
      assessmentType: type,
      assessmentDate,
      maxScore,
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
};
