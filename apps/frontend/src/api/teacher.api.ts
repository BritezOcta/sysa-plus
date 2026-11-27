import { apiRequest } from "./httpClient";

export interface StudentObservationItem {
  id: string;
  text: string;
  createdAt: string;
  authorName: string;
}

export interface CommissionStudentItem {
  enrollmentId: string;
  studentId: string;
  legajo: string;
  fullName: string;
  email: string;
  enrollmentStatus: string;
  attendancePercentage: number;
  /** RF-08: nota del alumno en cada evaluación de la comisión (mismo orden que `assessments`). */
  grades: { assessmentId: string; score: number | null }[];
  observations: StudentObservationItem[];
}

export interface CommissionStudentsResponse {
  commission: {
    id: string;
    subjectName: string;
    commissionCode: string;
  };
  assessments: { id: string; name: string; type: string; maxScore: number }[];
  students: CommissionStudentItem[];
}

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

export interface AssessmentGradeItem {
  enrollmentId: string;
  score: number;
}

export interface AssessmentItem {
  id: string;
  name: string;
  type: string;
  date: string | null;
  maxScore: number;
  isClosed: boolean;
  /** Solo RECUPERATORIO: id del parcial que recupera. */
  recoversAssessmentId: string | null;
  grades: AssessmentGradeItem[];
}

export type CourseCondition = "APROBADA" | "REGULAR" | "DESAPROBADA" | "LIBRE";

export interface CommissionGradesResponse {
  commission: {
    id: string;
    subjectName: string;
    commissionCode: string;
    /** RF-07: criterios de aprobación de la materia (escala 0-10). */
    criteria: { regularGrade: number; promotionGrade: number | null };
    /** ISO. null = la cursada sigue abierta. */
    closedAt: string | null;
  };
  students: {
    enrollmentId: string;
    legajo: string;
    fullName: string;
    enrollmentStatus: string;
    attendancePercentage: number;
    /** Condición que se guardaría al cerrar la cursada. null = inscripción cancelada. */
    projectedCondition: CourseCondition | null;
  }[];
  assessments: AssessmentItem[];
}

export interface TeacherExamCallSummary {
  id: string;
  subjectCode: string;
  subjectName: string;
  sessionName: string;
  callDate: string;
  classroom: string | null;
  callStatus: string;
  enrolledCount: number;
}

export interface ExamCallStudentItem {
  examEnrollmentId: string;
  legajo: string;
  fullName: string;
  examGrade: number | null;
  examStatus: string;
}

export interface ExamCallGradesResponse {
  examCall: {
    id: string;
    subjectCode: string;
    subjectName: string;
    sessionName: string;
    callDate: string;
    classroom: string | null;
    callStatus: string;
  };
  students: ExamCallStudentItem[];
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

  getStudents(commissionId: string): Promise<CommissionStudentsResponse> {
    return apiRequest<CommissionStudentsResponse>(
      `/teacher/commissions/${commissionId}/students`,
    );
  },

  async addObservation(
    commissionId: string,
    enrollmentId: string,
    text: string,
  ): Promise<StudentObservationItem> {
    const { observation } = await apiRequest<{
      observation: StudentObservationItem;
    }>(
      `/teacher/commissions/${commissionId}/students/${enrollmentId}/observations`,
      {
        method: "POST",
        body: { text },
      },
    );
    return observation;
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

  getGrades(commissionId: string): Promise<CommissionGradesResponse> {
    return apiRequest<CommissionGradesResponse>(
      `/teacher/commissions/${commissionId}/grades`,
    );
  },

  async createAssessment(
    commissionId: string,
    payload: {
      name: string;
      type: string;
      date?: string;
      maxScore?: number;
      recoversAssessmentId?: string;
    },
  ): Promise<AssessmentItem> {
    const { assessment } = await apiRequest<{ assessment: AssessmentItem }>(
      `/teacher/commissions/${commissionId}/assessments`,
      { method: "POST", body: payload },
    );
    return assessment;
  },

  saveGrades(
    commissionId: string,
    assessmentId: string,
    grades: AssessmentGradeItem[],
  ): Promise<{ savedCount: number }> {
    return apiRequest<{ savedCount: number }>(
      `/teacher/commissions/${commissionId}/assessments/${assessmentId}/grades`,
      { method: "PUT", body: { grades } },
    );
  },

  closeAssessment(
    commissionId: string,
    assessmentId: string,
  ): Promise<{ id: string; isClosed: boolean }> {
    return apiRequest<{ id: string; isClosed: boolean }>(
      `/teacher/commissions/${commissionId}/assessments/${assessmentId}/close`,
      { method: "POST" },
    );
  },

  /** RF-07: calcula y guarda la condición final de cada alumno y cierra la cursada. */
  closeCourse(commissionId: string): Promise<{ closedCount: number }> {
    return apiRequest<{ closedCount: number }>(
      `/teacher/commissions/${commissionId}/close`,
      { method: "POST" },
    );
  },

  async getExamCalls(): Promise<TeacherExamCallSummary[]> {
    const { examCalls } = await apiRequest<{
      examCalls: TeacherExamCallSummary[];
    }>("/teacher/exam-calls");
    return examCalls;
  },

  getExamCallGrades(examCallId: string): Promise<ExamCallGradesResponse> {
    return apiRequest<ExamCallGradesResponse>(
      `/teacher/exam-calls/${examCallId}/grades`,
    );
  },

  saveExamCallGrades(
    examCallId: string,
    grades: { examEnrollmentId: string; examGrade: number }[],
  ): Promise<{ savedCount: number }> {
    return apiRequest<{ savedCount: number }>(
      `/teacher/exam-calls/${examCallId}/grades`,
      {
        method: "PUT",
        body: { grades },
      },
    );
  },

  closeExamCall(
    examCallId: string,
  ): Promise<{ id: string; callStatus: string }> {
    return apiRequest<{ id: string; callStatus: string }>(
      `/teacher/exam-calls/${examCallId}/close`,
      { method: "POST" },
    );
  },
};
