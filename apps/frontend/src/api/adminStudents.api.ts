import { apiRequest } from "./httpClient";

export interface AdminCommissionSummary {
  id: string;
  subjectCode: string;
  subjectName: string;
  commissionCode: string;
  period: string;
  enrolledCount: number;
}

export interface AdminStudentObservation {
  id: string;
  text: string;
  createdAt: string;
  teacherName: string;
}

export interface AdminStudentRow {
  enrollmentId: string;
  legajo: string;
  fullName: string;
  email: string;
  enrollmentStatus: string;
  attendancePercentage: number;
  observations: AdminStudentObservation[];
}

export interface AdminCommissionStudentsResponse {
  commission: {
    id: string;
    subjectCode: string;
    subjectName: string;
    commissionCode: string;
    period: string;
  };
  students: AdminStudentRow[];
}

export const adminStudentsApi = {
  async getCommissions(): Promise<AdminCommissionSummary[]> {
    const { commissions } = await apiRequest<{
      commissions: AdminCommissionSummary[];
    }>("/admin/commissions");
    return commissions;
  },

  getCommissionStudents(
    commissionId: string,
  ): Promise<AdminCommissionStudentsResponse> {
    return apiRequest<AdminCommissionStudentsResponse>(
      `/admin/commissions/${commissionId}/students`,
    );
  },
};
