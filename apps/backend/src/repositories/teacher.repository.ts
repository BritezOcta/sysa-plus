import { prisma } from "../lib/prisma.js";

export const teacherRepository = {
  async findTeacherProfileByUserId(userId: number) {
    return prisma.teacherProfile.findUnique({
      where: { userId },
    });
  },

  async findAssignedCommissions(teacherId: number) {
    return prisma.teacherAssignment.findMany({
      where: { teacherId },
      include: {
        courseOffering: {
          include: {
            academicPeriod: true,
            studyPlanSubject: {
              include: { subject: true },
            },
            _count: {
              select: { courseEnrollments: true },
            },
          },
        },
      },
      orderBy: { courseOfferingId: "asc" },
    });
  },

  async findTeacherAssignment(teacherId: number, courseOfferingId: number) {
    return prisma.teacherAssignment.findUnique({
      where: {
        teacherId_courseOfferingId: { teacherId, courseOfferingId },
      },
      include: {
        courseOffering: {
          include: {
            academicPeriod: true,
            studyPlanSubject: { include: { subject: true } },
          },
        },
      },
    });
  },

  async findCommissionAttendanceData(
    courseOfferingId: number,
    sessionDate: Date,
  ) {
    const [enrollments, sessions] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: { courseOfferingId },
        include: {
          studentCareer: {
            include: {
              studentProfile: {
                include: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
          attendances: true,
        },
        orderBy: {
          studentCareer: {
            studentProfile: { legajo: "asc" },
          },
        },
      }),
      prisma.classSession.findMany({
        where: { courseOfferingId },
        include: { attendances: true },
        orderBy: { sessionDate: "desc" },
      }),
    ]);

    const targetIso = sessionDate.toISOString().slice(0, 10);
    const existingSession =
      sessions.find(
        (s) => s.sessionDate.toISOString().slice(0, 10) === targetIso,
      ) ?? null;

    return { enrollments, sessions, existingSession };
  },

  async saveClassAttendance(params: {
    courseOfferingId: number;
    sessionDate: Date;
    sessionTopic: string | null;
    records: { courseEnrollmentId: number; attendanceStatus: string }[];
    enrollmentUpdates: {
      courseEnrollmentId: number;
      enrollmentStatus: string;
    }[];
    audit: {
      userId: number;
      action: string;
      details: string;
      ipAddress: string | null;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.classSession.findFirst({
        where: {
          courseOfferingId: params.courseOfferingId,
          sessionDate: params.sessionDate,
        },
      });

      const session = existing
        ? await tx.classSession.update({
            where: { classSessionId: existing.classSessionId },
            data: { sessionTopic: params.sessionTopic },
          })
        : await tx.classSession.create({
            data: {
              courseOfferingId: params.courseOfferingId,
              sessionDate: params.sessionDate,
              sessionTopic: params.sessionTopic,
            },
          });

      for (const rec of params.records) {
        await tx.attendance.upsert({
          where: {
            classSessionId_courseEnrollmentId: {
              classSessionId: session.classSessionId,
              courseEnrollmentId: rec.courseEnrollmentId,
            },
          },
          update: { attendanceStatus: rec.attendanceStatus },
          create: {
            classSessionId: session.classSessionId,
            courseEnrollmentId: rec.courseEnrollmentId,
            attendanceStatus: rec.attendanceStatus,
          },
        });
      }

      for (const upd of params.enrollmentUpdates) {
        await tx.courseEnrollment.update({
          where: { courseEnrollmentId: upd.courseEnrollmentId },
          data: { enrollmentStatus: upd.enrollmentStatus },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: params.audit.userId,
          action: params.audit.action,
          entity: "ASISTENCIA",
          entityId: String(session.classSessionId),
          details: params.audit.details,
          ipAddress: params.audit.ipAddress,
        },
      });

      return session;
    });
  },
};
