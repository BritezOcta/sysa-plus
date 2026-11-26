import { prisma } from "../lib/prisma.js";
import { EXAM_CALL_STATUS, EXAM_STATUS } from "../types/academic.js";

export const teacherRepository = {
  async findTeacherProfileByUserId(userId: number) {
    return prisma.teacherProfile.findUnique({
      where: { userId },
    });
  },

  async findCommissionStudents(courseOfferingId: number) {
    const [enrollments, totalSessions, assessments] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: { courseOfferingId },
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
          attendances: true,
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
      }),
      prisma.classSession.count({ where: { courseOfferingId } }),
      prisma.assessment.findMany({
        where: { courseOfferingId },
        include: { assessmentGrades: true },
        orderBy: [{ assessmentDate: "asc" }, { assessmentId: "asc" }],
      }),
    ]);

    return { enrollments, totalSessions, assessments };
  },

  async findEnrollmentInCommission(
    courseEnrollmentId: number,
    courseOfferingId: number,
  ) {
    return prisma.courseEnrollment.findFirst({
      where: { courseEnrollmentId, courseOfferingId },
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
      },
    });
  },

  async createStudentObservation(params: {
    courseEnrollmentId: number;
    teacherId: number;
    observationText: string;
    audit: {
      userId: number;
      details: string;
      ipAddress: string | null;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const observation = await tx.studentObservation.create({
        data: {
          courseEnrollmentId: params.courseEnrollmentId,
          teacherId: params.teacherId,
          observationText: params.observationText,
        },
        include: {
          teacherProfile: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: params.audit.userId,
          action: "ALTA_OBSERVACION",
          entity: "STUDENT_OBSERVATION",
          entityId: String(observation.observationId),
          details: params.audit.details,
          ipAddress: params.audit.ipAddress,
        },
      });

      return observation;
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

  async findCommissionGradesData(courseOfferingId: number) {
    const [assessments, enrollments, totalSessions] = await Promise.all([
      prisma.assessment.findMany({
        where: { courseOfferingId },
        include: {
          assessmentGrades: true,
        },
        orderBy: [{ assessmentDate: "asc" }, { assessmentId: "asc" }],
      }),
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
          attendances: { select: { attendanceStatus: true } },
        },
        orderBy: {
          studentCareer: {
            studentProfile: { legajo: "asc" },
          },
        },
      }),
      prisma.classSession.count({ where: { courseOfferingId } }),
    ]);

    return { assessments, enrollments, totalSessions };
  },

  async findAssessmentInCommission(
    assessmentId: number,
    courseOfferingId: number,
  ) {
    return prisma.assessment.findFirst({
      where: { assessmentId, courseOfferingId },
    });
  },

  async createAssessment(params: {
    courseOfferingId: number;
    assessmentName: string;
    assessmentType: string;
    assessmentDate: Date | null;
    maxScore: number;
    recoversAssessmentId: number | null;
    audit: {
      userId: number;
      details: string;
      ipAddress: string | null;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          courseOfferingId: params.courseOfferingId,
          assessmentName: params.assessmentName,
          assessmentType: params.assessmentType,
          assessmentDate: params.assessmentDate,
          maxScore: params.maxScore,
          recoversAssessmentId: params.recoversAssessmentId,
          isClosed: false,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: params.audit.userId,
          action: "ALTA_EVALUACION",
          entity: "ASSESSMENTS",
          entityId: String(assessment.assessmentId),
          details: params.audit.details,
          ipAddress: params.audit.ipAddress,
        },
      });

      return assessment;
    });
  },

  async saveAssessmentGrades(params: {
    assessmentId: number;
    grades: { courseEnrollmentId: number; score: number }[];
    audit: {
      userId: number;
      details: string;
      ipAddress: string | null;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      for (const item of params.grades) {
        const existing = await tx.assessmentGrade.findFirst({
          where: {
            assessmentId: params.assessmentId,
            courseEnrollmentId: item.courseEnrollmentId,
          },
        });

        if (existing) {
          await tx.assessmentGrade.update({
            where: { assessmentGradeId: existing.assessmentGradeId },
            data: { gradeScore: item.score },
          });
        } else {
          await tx.assessmentGrade.create({
            data: {
              assessmentId: params.assessmentId,
              courseEnrollmentId: item.courseEnrollmentId,
              gradeScore: item.score,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: params.audit.userId,
          action: "CARGA_NOTAS",
          entity: "ASSESSMENT_GRADES",
          entityId: String(params.assessmentId),
          details: params.audit.details,
          ipAddress: params.audit.ipAddress,
        },
      });
    });
  },

  async closeAssessment(params: {
    assessmentId: number;
    audit: {
      userId: number;
      details: string;
      ipAddress: string | null;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.assessment.update({
        where: { assessmentId: params.assessmentId },
        data: { isClosed: true },
      });

      await tx.auditLog.create({
        data: {
          userId: params.audit.userId,
          action: "CIERRE_ACTA",
          entity: "ASSESSMENTS",
          entityId: String(params.assessmentId),
          details: params.audit.details,
          ipAddress: params.audit.ipAddress,
        },
      });

      return updated;
    });
  },

  /** RF-07: guarda la condición final de cada alumno, cierra las actas abiertas y la cursada. */
  async closeCourse(params: {
    courseOfferingId: number;
    conditions: { courseEnrollmentId: number; enrollmentStatus: string }[];
    audit: {
      userId: number;
      details: string;
      ipAddress: string | null;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      for (const c of params.conditions) {
        await tx.courseEnrollment.update({
          where: { courseEnrollmentId: c.courseEnrollmentId },
          data: { enrollmentStatus: c.enrollmentStatus },
        });
      }

      await tx.assessment.updateMany({
        where: { courseOfferingId: params.courseOfferingId, isClosed: false },
        data: { isClosed: true },
      });

      const offering = await tx.courseOffering.update({
        where: { courseOfferingId: params.courseOfferingId },
        data: { gradesClosedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId: params.audit.userId,
          action: "CIERRE_CURSADA",
          entity: "COURSE_OFFERING",
          entityId: String(params.courseOfferingId),
          details: params.audit.details,
          ipAddress: params.audit.ipAddress,
        },
      });

      return offering;
    });
  },

  async findTeacherExamCalls(teacherId: number) {
    return prisma.examCall.findMany({
      where: { teacherId },
      include: {
        examSession: true,
        studyPlanSubject: {
          include: { subject: true },
        },
        examEnrollments: {
          where: { examStatus: { not: EXAM_STATUS.CANCELADA } },
          select: { examEnrollmentId: true },
        },
      },
      orderBy: { callDate: "desc" },
    });
  },

  async findTeacherExamCallById(examCallId: number, teacherId: number) {
    return prisma.examCall.findFirst({
      where: { examCallId, teacherId },
      include: {
        examSession: true,
        studyPlanSubject: {
          include: { subject: true },
        },
        examEnrollments: {
          where: { examStatus: { not: EXAM_STATUS.CANCELADA } },
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

  async saveExamCallGrades(params: {
    examCallId: number;
    grades: {
      examEnrollmentId: number;
      examGrade: number;
      examStatus: string;
    }[];
    audit: {
      userId: number;
      details: string;
      ipAddress: string | null;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      for (const item of params.grades) {
        await tx.examEnrollment.update({
          where: { examEnrollmentId: item.examEnrollmentId },
          data: {
            examGrade: item.examGrade,
            examStatus: item.examStatus,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: params.audit.userId,
          action: "CARGA_NOTAS_FINAL",
          entity: "EXAM_ENROLLMENT",
          entityId: String(params.examCallId),
          details: params.audit.details,
          ipAddress: params.audit.ipAddress,
        },
      });
    });
  },

  async closeExamCall(params: {
    examCallId: number;
    audit: {
      userId: number;
      details: string;
      ipAddress: string | null;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.examCall.update({
        where: { examCallId: params.examCallId },
        data: { callStatus: EXAM_CALL_STATUS.CERRADA },
      });

      await tx.auditLog.create({
        data: {
          userId: params.audit.userId,
          action: "CIERRE_ACTA_FINAL",
          entity: "EXAM_CALL",
          entityId: String(params.examCallId),
          details: params.audit.details,
          ipAddress: params.audit.ipAddress,
        },
      });

      return updated;
    });
  },
};
