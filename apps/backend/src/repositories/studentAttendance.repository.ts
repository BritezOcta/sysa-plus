import { prisma } from "../lib/prisma.js";
import { ENROLLMENT_STATUS } from "../types/academic.js";

export const studentAttendanceRepository = {
  async findStudentProfileByUserId(userId: number) {
    return prisma.studentProfile.findUnique({
      where: { userId },
      select: { studentId: true, legajo: true },
    });
  },

  async findStudentEnrollmentsWithAttendance(studentId: number) {
    return prisma.courseEnrollment.findMany({
      where: {
        studentCareer: { studentId },
        enrollmentStatus: { not: ENROLLMENT_STATUS.CANCELADA },
      },
      include: {
        courseOffering: {
          include: {
            academicPeriod: true,
            studyPlanSubject: {
              include: { subject: true },
            },
            classSessions: {
              orderBy: { sessionDate: "desc" },
            },
          },
        },
        attendances: {
          include: {
            classSession: true,
          },
        },
      },
      orderBy: [
        { courseOffering: { academicPeriod: { year: "desc" } } },
        { courseOffering: { academicPeriod: { semester: "desc" } } },
        {
          courseOffering: {
            studyPlanSubject: { subject: { subjectName: "asc" } },
          },
        },
      ],
    });
  },
};
