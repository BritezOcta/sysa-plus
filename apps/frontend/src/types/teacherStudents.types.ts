export interface TeacherCommission {
  id: string;
  subjectName: string;
  commissionCode: string;
  schedule: string;
}

export interface StudentObservation {
  id: string;
  studentId: string;
  commissionId: string;
  teacherName: string;
  text: string;
  createdAt: string;
}

export interface CommissionStudent {
  enrollmentId: string;
  studentId: string;
  legajo: string;
  fullName: string;
  attendancePercentage: number;
  grades: { label: string; score: number | null }[];
  observations: StudentObservation[];
}
