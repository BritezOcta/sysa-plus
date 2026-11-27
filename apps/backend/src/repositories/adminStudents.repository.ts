import { prisma } from "../lib/prisma.js";
import { ENROLLMENT_STATUS } from "../types/academic.js";

export const adminStudentsRepository = {
  async findAllCommissions() {
    return prisma.courseOffering.findMany({
      include: {
        academicPeriod: true,
        studyPlanSubject: {
          include: { subject: true },
        },
        courseEnrollments: {
          where: { enrollmentStatus: { not: ENROLLMENT_STATUS.CANCELADA } },
          select: { courseEnrollmentId: true },
        },
      },
      orderBy: [
        { academicPeriod: { year: "desc" } },
        { academicPeriod: { semester: "desc" } },
        { studyPlanSubject: { subject: { subjectName: "asc" } } },
        { commission: "asc" },
      ],
    });
  },

  async findCommissionStudentsWithObservations(courseOfferingId: number) {
    return prisma.courseOffering.findUnique({
      where: { courseOfferingId },
      include: {
        academicPeriod: true,
        studyPlanSubject: {
          include: { subject: true },
        },
        courseEnrollments: {
          where: { enrollmentStatus: { not: ENROLLMENT_STATUS.CANCELADA } },
          include: {
            studentCareer: {
              include: {
                studentProfile: {
                  include: {
                    user: {
                      select: { firstName: true, lastName: true, email: true },
                    },
                  },
                },
              },
            },
            attendances: {
              select: { attendanceStatus: true },
            },
            studentObservations: {
              include: {
                teacherProfile: {
                  include: {
                    user: { select: { firstName: true, lastName: true } },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: {
            studentCareer: {
              studentProfile: { legajo: "asc" },
            },
          },
        },
      },
    });
  },
};
