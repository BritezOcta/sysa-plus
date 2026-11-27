import { apiRequest } from "./httpClient";

export type AttendanceSessionStatus = "PRESENTE" | "AUSENTE" | "JUSTIFICADO" | "TARDANZA" | "SIN_REGISTRO";

export interface StudentAttendanceSession {
  sessionId: string;
  date: string;
  topic: string | null;
  status: AttendanceSessionStatus;
}

/** Mismo cálculo que el cierre de cursada: asistencia ponderada (tardanza = ½) sobre todas las clases. */
export interface StudentAttendanceSummary {
  totalClasses: number;
  presentCount: number;
  justifiedCount: number;
  lateCount: number;
  absentCount: number;
  unrecordedCount: number;
  attendancePercentage: number;
  minPercentage: number;
  atRisk: boolean;
}

export interface StudentCourseAttendance {
  enrollmentId: string;
  subjectCode: string;
  subjectName: string;
  commission: string;
  period: string;
  enrollmentStatus: string;
  inProgress: boolean;
  summary: StudentAttendanceSummary;
  /** Más reciente primero. */
  sessions: StudentAttendanceSession[];
}

export const studentAttendanceApi = {
  async getMyAttendance(): Promise<StudentCourseAttendance[]> {
    const { courses } = await apiRequest<{
      courses: StudentCourseAttendance[];
    }>("/student/attendance");
    return courses;
  },
};
