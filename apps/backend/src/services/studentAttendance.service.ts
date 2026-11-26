import { AppError } from "../lib/AppError.js";
import { studentAttendanceRepository } from "../repositories/studentAttendance.repository.js";

export const studentAttendanceService = {
  async getMyAttendance(user: { userId: number }) {
    const profile =
      await studentAttendanceRepository.findStudentProfileByUserId(user.userId);
    if (!profile) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Acceso denegado: perfil de alumno no encontrado.",
      );
    }

    const enrollments =
      await studentAttendanceRepository.findStudentEnrollmentsWithAttendance(
        profile.studentId,
      );

    return enrollments.map((enr) => {
      const attendanceBySession = new Map(
        enr.attendances.map((a) => [a.classSessionId, a.attendanceStatus]),
      );

      const sessions = enr.courseOffering.classSessions.map((session) => ({
        sessionId: String(session.classSessionId),
        date: session.sessionDate.toISOString().slice(0, 10),
        topic: session.sessionTopic,
        status:
          attendanceBySession.get(session.classSessionId) ?? "SIN_REGISTRO",
      }));

      const recordedSessions = sessions.filter(
        (s) => s.status !== "SIN_REGISTRO",
      );
      const presentCount = recordedSessions.filter(
        (s) =>
          s.status === "PRESENTE" ||
          s.status === "JUSTIFICADO" ||
          s.status === "TARDANZA",
      ).length;
      const absentCount = recordedSessions.filter(
        (s) => s.status === "AUSENTE",
      ).length;
      const totalRecorded = recordedSessions.length;
      const attendancePercentage =
        totalRecorded > 0
          ? Math.round((presentCount / totalRecorded) * 100)
          : 100;

      return {
        enrollmentId: String(enr.courseEnrollmentId),
        subjectCode: enr.courseOffering.studyPlanSubject.subject.subjectCode,
        subjectName: enr.courseOffering.studyPlanSubject.subject.subjectName,
        commission: enr.courseOffering.commission,
        period: `${enr.courseOffering.academicPeriod.year} - ${enr.courseOffering.academicPeriod.semester}° Cuat.`,
        enrollmentStatus: enr.enrollmentStatus,
        summary: {
          totalClasses: totalRecorded,
          presentCount,
          absentCount,
          attendancePercentage,
        },
        sessions,
      };
    });
  },
};
