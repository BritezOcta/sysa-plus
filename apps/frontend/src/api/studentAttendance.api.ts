import { apiRequest } from "./httpClient";

export interface StudentAttendanceSession {
  sessionId: string;
  date: string;
  topic: string | null;
  status: string;
}

export interface StudentCourseAttendance {
  enrollmentId: string;
  subjectCode: string;
  subjectName: string;
  commission: string;
  period: string;
  enrollmentStatus: string;
  summary: {
    totalClasses: number;
    presentCount: number;
    absentCount: number;
    attendancePercentage: number;
  };
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
