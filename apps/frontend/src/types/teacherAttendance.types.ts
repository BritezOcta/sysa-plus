export type AttendanceStatus = "PRESENTE" | "AUSENTE" | "JUSTIFICADO";

export type AttendanceCondition = "REGULAR" | "EN_RIESGO" | "LIBRE";

export interface AttendanceCommission {
  id: string;
  subjectName: string;
  commissionCode: string;
  periodStart: string; // YYYY-MM-DD (ACADEMIC_PERIOD.PERIOD_START_DATE)
  periodEnd: string; // YYYY-MM-DD (ACADEMIC_PERIOD.PERIOD_END_DATE)
}

export interface AttendanceStudent {
  enrollmentId: string;
  studentId: string;
  legajo: string;
  fullName: string;
  previousTotalClasses: number;
  previousAttendedClasses: number;
}

export interface ClassAttendanceRecord {
  date: string;
  topic: string;
  records: Record<string, AttendanceStatus>; // key: enrollmentId
  updatedBy: string;
  updatedAt: string;
}
