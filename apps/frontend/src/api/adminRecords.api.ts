import { apiRequest } from "./httpClient";

export interface ClosedCourse {
  id: string;
  subjectName: string;
  commission: string;
  period: string;
  closedAt: string;
}

export interface ClosedAssessment {
  id: string;
  name: string;
  type: string;
  subjectName: string;
  commission: string;
  period: string;
}

export interface ClosedExamCall {
  id: string;
  subjectName: string;
  sessionName: string;
  callDate: string;
}

export interface ClosedRecords {
  courses: ClosedCourse[];
  assessments: ClosedAssessment[];
  examCalls: ClosedExamCall[];
}

export type RecordKind = "courses" | "assessments" | "exam-calls";

/** RF-07: actas cerradas y reapertura (Administrador/Director). */
export const adminRecordsApi = {
  listClosed(): Promise<ClosedRecords> {
    return apiRequest<ClosedRecords>("/admin/records/closed");
  },

  reopen(kind: RecordKind, id: string, reason: string): Promise<void> {
    return apiRequest<void>(`/admin/records/${kind}/${id}/reopen`, {
      method: "POST",
      body: { reason },
    });
  },
};
