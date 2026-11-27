import { AppError } from "../lib/AppError.js";
import { attendanceSummary } from "../lib/attendance.js";
import { isCourseInProgress } from "../lib/studentCourses.js";
import { MIN_ATTENDANCE_PERCENT } from "../types/academic.js";
import { todayAsDate } from "./courseEnrollment.service.js";
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

    const today = todayAsDate();
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

      // Una clase sin registro del alumno cuenta como falta (misma regla que el cierre de cursada).
      const summary = attendanceSummary(
        enr.courseOffering.classSessions.map((session) => attendanceBySession.get(session.classSessionId) ?? null),
      );

      return {
        enrollmentId: String(enr.courseEnrollmentId),
        subjectCode: enr.courseOffering.studyPlanSubject.subject.subjectCode,
        subjectName: enr.courseOffering.studyPlanSubject.subject.subjectName,
        commission: enr.courseOffering.commission,
        period: `${enr.courseOffering.academicPeriod.year} - ${enr.courseOffering.academicPeriod.semester}° Cuat.`,
        enrollmentStatus: enr.enrollmentStatus,
        inProgress: isCourseInProgress(enr.courseOffering.academicPeriod.periodEndDate, today),
        summary: {
          ...summary,
          minPercentage: MIN_ATTENDANCE_PERCENT,
          atRisk: summary.totalClasses > 0 && summary.attendancePercentage < MIN_ATTENDANCE_PERCENT,
        },
        sessions,
      };
    });
  },
};
