import { prisma } from "../lib/prisma.js";
import { ENROLLMENT_STATUS } from "../types/academic.js";
import type { SurveyAnswers } from "../lib/studentCourses.js";

export const studentCoursesRepository = {
  async findStudentProfileByUserId(userId: number) {
    return prisma.studentProfile.findUnique({ where: { userId }, select: { studentId: true } });
  },

  /** Cursadas no canceladas del alumno con sus evaluaciones y solo las notas de esa inscripción. */
  async findCoursesWithGrades(studentId: number) {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentCareer: { studentId }, enrollmentStatus: { not: ENROLLMENT_STATUS.CANCELADA } },
      include: {
        courseOffering: {
          include: {
            academicPeriod: true,
            studyPlanSubject: { include: { subject: true } },
            assessments: {
              include: { recoversAssessment: { select: { assessmentName: true } } },
              // Orden de carga del docente: una fecha null no debe adelantar un recuperatorio a su parcial.
              orderBy: { assessmentId: "asc" },
            },
          },
        },
        assessmentGrades: true,
        surveySubmission: { select: { surveySubmissionId: true } },
      },
      orderBy: [
        { courseOffering: { academicPeriod: { year: "desc" } } },
        { courseOffering: { academicPeriod: { semester: "desc" } } },
        { courseOffering: { studyPlanSubject: { subject: { subjectName: "asc" } } } },
      ],
    });
    return enrollments;
  },

  async findEnrollmentForSurvey(courseEnrollmentId: number, studentId: number) {
    return prisma.courseEnrollment.findFirst({
      where: {
        courseEnrollmentId,
        studentCareer: { studentId },
        enrollmentStatus: { not: ENROLLMENT_STATUS.CANCELADA },
      },
      select: {
        courseOfferingId: true,
        courseOffering: { select: { academicPeriod: { select: { periodStartDate: true, periodEndDate: true } } } },
        surveySubmission: { select: { surveySubmissionId: true } },
      },
    });
  },

  /** Registro de envío y respuesta anónima en la misma transacción: o quedan las dos o ninguna. */
  async createSurvey(input: { courseEnrollmentId: number; courseOfferingId: number; answers: SurveyAnswers; comment: string | null }) {
    const [q1, q2, q3, q4, q5] = input.answers;
    await prisma.$transaction([
      prisma.surveySubmission.create({ data: { courseEnrollmentId: input.courseEnrollmentId } }),
      prisma.surveyResponse.create({
        data: { courseOfferingId: input.courseOfferingId, q1, q2, q3, q4, q5, comment: input.comment },
      }),
    ]);
  },
};
