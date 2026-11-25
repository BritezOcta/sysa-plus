import { apiRequest } from "./httpClient";

export interface TeacherCommissionSummary {
  id: string;
  subjectName: string;
  subjectCode: string;
  commissionCode: string;
  periodStart: string;
  periodEnd: string;
  enrolledCount: number;
}

export interface AttendanceStudentRow {
  enrollmentId: string;
  studentId: string;
  legajo: string;
  fullName: string;
  previousTotalClasses: number;
  previousAttendedClasses: number;
  currentStatus: "PRESENTE" | "AUSENTE" | "JUSTIFICADO" | "";
}

export interface CommissionAttendanceResponse {
  commission: {
    id: string;
    subjectName: string;
    commissionCode: string;
    periodStart: string;
    periodEnd: string;
  };
  existingSession: {
    classSessionId: number;
    date: string;
    topic: string;
  } | null;
  students: AttendanceStudentRow[];
}

export interface SaveAttendancePayload {
  date: string;
  topic?: string;
  allowOverwrite: boolean;
  records: {
    enrollmentId: string;
    status: "PRESENTE" | "AUSENTE" | "JUSTIFICADO";
  }[];
}

export interface SaveAttendanceResponse {
  classSessionId: number;
  date: string;
  updatedStudents: number;
}

/** Módulo docente: comisiones asignadas y RF-05 asistencias. */
export const teacherApi = {
  async getCommissions(): Promise<TeacherCommissionSummary[]> {
    const { commissions } = await apiRequest<{
      commissions: TeacherCommissionSummary[];
    }>("/teacher/commissions");
    return commissions;
  },

  getAttendance(
    commissionId: string,
    date: string,
  ): Promise<CommissionAttendanceResponse> {
    const params = new URLSearchParams({ date });
    return apiRequest<CommissionAttendanceResponse>(
      `/teacher/commissions/${commissionId}/attendance?${params.toString()}`,
    );
  },

  saveAttendance(
    commissionId: string,
    payload: SaveAttendancePayload,
  ): Promise<SaveAttendanceResponse> {
    return apiRequest<SaveAttendanceResponse>(
      `/teacher/commissions/${commissionId}/attendance`,
      {
        method: "PUT",
        body: payload,
      },
    );
  },
};
