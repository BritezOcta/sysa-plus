import { prisma } from "../lib/prisma.js";
import { EXAM_CALL_STATUS } from "../types/academic.js";

type Audit = { userId: number; details: string; ipAddress: string | null };

const subjectInclude = { studyPlanSubject: { include: { subject: true } } } as const;

/** RF-07: actas cerradas y su reapertura por el Administrador/Director. */
export const adminRecordsRepository = {
  async findClosedRecords() {
    const [courses, assessments, examCalls] = await Promise.all([
      prisma.courseOffering.findMany({
        where: { gradesClosedAt: { not: null } },
        include: { ...subjectInclude, academicPeriod: true },
        orderBy: { gradesClosedAt: "desc" },
      }),
      // Un acta de parcial solo se reabre sola si su cursada sigue abierta.
      prisma.assessment.findMany({
        where: { isClosed: true, courseOffering: { gradesClosedAt: null } },
        include: { courseOffering: { include: { ...subjectInclude, academicPeriod: true } } },
        orderBy: { assessmentId: "desc" },
      }),
      prisma.examCall.findMany({
        where: { callStatus: EXAM_CALL_STATUS.CERRADA },
        include: { ...subjectInclude, examSession: true },
        orderBy: { callDate: "desc" },
      }),
    ]);
    return { courses, assessments, examCalls };
  },

  findCourse(courseOfferingId: number) {
    return prisma.courseOffering.findUnique({ where: { courseOfferingId }, include: subjectInclude });
  },

  findAssessment(assessmentId: number) {
    return prisma.assessment.findUnique({
      where: { assessmentId },
      include: { courseOffering: { include: subjectInclude } },
    });
  },

  findExamCall(examCallId: number) {
    return prisma.examCall.findUnique({ where: { examCallId }, include: subjectInclude });
  },

  reopenCourse(courseOfferingId: number, audit: Audit) {
    return prisma.$transaction([
      prisma.courseOffering.update({ where: { courseOfferingId }, data: { gradesClosedAt: null } }),
      prisma.auditLog.create({
        data: { ...audit, action: "REAPERTURA_CURSADA", entity: "COURSE_OFFERING", entityId: String(courseOfferingId) },
      }),
    ]);
  },

  reopenAssessment(assessmentId: number, audit: Audit) {
    return prisma.$transaction([
      prisma.assessment.update({ where: { assessmentId }, data: { isClosed: false } }),
      prisma.auditLog.create({
        data: { ...audit, action: "REAPERTURA_ACTA", entity: "ASSESSMENTS", entityId: String(assessmentId) },
      }),
    ]);
  },

  reopenExamCall(examCallId: number, audit: Audit) {
    return prisma.$transaction([
      prisma.examCall.update({ where: { examCallId }, data: { callStatus: EXAM_CALL_STATUS.ABIERTA } }),
      prisma.auditLog.create({
        data: { ...audit, action: "REAPERTURA_ACTA_FINAL", entity: "EXAM_CALL", entityId: String(examCallId) },
      }),
    ]);
  },
};
