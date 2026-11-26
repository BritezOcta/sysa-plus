import { prisma } from "../lib/prisma.js";
import { ENROLLMENT_STATUS } from "../types/academic.js";

const subjectNameSelect = { select: { subjectCode: true, subjectName: true } } as const;

/** RF-09: lecturas para el estado académico del alumno. */
export const academicStatusRepository = {
  /** Materias activas del plan con todas sus correlatividades (para cursar y para rendir). */
  findPlanSubjects(studyPlanId: number) {
    return prisma.studyPlanSubject.findMany({
      where: { studyPlanId, isActive: true },
      orderBy: [{ subjectYear: "asc" }, { semester: "asc" }, { studyPlanSubjectId: "asc" }],
      select: {
        studyPlanSubjectId: true,
        subjectYear: true,
        semester: true,
        weeklyHours: true,
        totalHours: true,
        subject: subjectNameSelect,
        requirements: {
          select: {
            correlativityType: true,
            requiredSubject: {
              select: { studyPlanSubjectId: true, studyPlanId: true, subject: subjectNameSelect },
            },
          },
        },
      },
    });
  },

  /** Cursadas del alumno (sin las canceladas), con su período. */
  findCourseEnrollments(studentCareerId: number) {
    return prisma.courseEnrollment.findMany({
      where: { studentCareerId, enrollmentStatus: { not: ENROLLMENT_STATUS.CANCELADA } },
      select: {
        enrollmentStatus: true,
        courseOffering: {
          select: {
            studyPlanSubjectId: true,
            commission: true,
            academicPeriod: { select: { year: true, semester: true, periodEndDate: true } },
            studyPlanSubject: { select: { subject: subjectNameSelect } },
          },
        },
      },
    });
  },

  /** Finales rendidos (con nota cargada). */
  findGradedExams(studentCareerId: number) {
    return prisma.examEnrollment.findMany({
      where: { studentCareerId, examGrade: { not: null } },
      select: {
        examGrade: true,
        examCall: {
          select: {
            callDate: true,
            studyPlanSubjectId: true,
            examSession: { select: { examName: true } },
            studyPlanSubject: { select: { subject: subjectNameSelect } },
          },
        },
      },
    });
  },
};
