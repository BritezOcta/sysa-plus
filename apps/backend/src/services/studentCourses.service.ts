import { AppError } from "../lib/AppError.js";
import {
  conditionLabel,
  isCourseInProgress,
  isSurveyOpen,
  mapSurveyError,
  parseSurveyPayload,
  periodLabel,
  SURVEY_QUESTIONS,
  surveyState,
  type StudentCourseDto,
} from "../lib/studentCourses.js";
import { studentCoursesRepository } from "../repositories/studentCourses.repository.js";
import { todayAsDate, toIsoDate } from "./courseEnrollment.service.js";

async function requireStudentId(userId: number): Promise<number> {
  const profile = await studentCoursesRepository.findStudentProfileByUserId(userId);
  if (!profile) {
    throw new AppError(403, "FORBIDDEN", "Acceso denegado: perfil de alumno no encontrado.");
  }
  return profile.studentId;
}

function enrollmentNotFound(): AppError {
  return new AppError(404, "ENROLLMENT_NOT_FOUND", "No encontramos esa cursada.");
}

export const studentCoursesService = {
  async getMyCourses(user: { userId: number }) {
    const studentId = await requireStudentId(user.userId);
    const today = todayAsDate();
    const enrollments = await studentCoursesRepository.findCoursesWithGrades(studentId);

    const courses = enrollments.map((enr): StudentCourseDto => {
      const offering = enr.courseOffering;
      const inProgress = isCourseInProgress(offering.academicPeriod.periodEndDate, today);
      const scoreByAssessment = new Map(enr.assessmentGrades.map((g) => [g.assessmentId, Number(g.gradeScore)]));
      return {
        enrollmentId: String(enr.courseEnrollmentId),
        subjectCode: offering.studyPlanSubject.subject.subjectCode,
        subjectName: offering.studyPlanSubject.subject.subjectName,
        commission: offering.commission,
        period: periodLabel(offering.academicPeriod.year, offering.academicPeriod.semester),
        inProgress,
        condition: conditionLabel(enr.enrollmentStatus, inProgress),
        gradesClosed: offering.gradesClosedAt !== null,
        assessments: offering.assessments.map((a) => ({
          id: String(a.assessmentId),
          name: a.assessmentName,
          type: a.assessmentType,
          date: a.assessmentDate ? toIsoDate(a.assessmentDate) : null,
          maxScore: Number(a.maxScore),
          score: scoreByAssessment.get(a.assessmentId) ?? null,
          isClosed: a.isClosed,
          recoversName: a.recoversAssessment?.assessmentName ?? null,
        })),
        survey: surveyState(
          isSurveyOpen(offering.academicPeriod.periodStartDate, offering.academicPeriod.periodEndDate, today),
          enr.surveySubmission !== null,
        ),
      };
    });

    return { questions: [...SURVEY_QUESTIONS], courses };
  },

  async submitSurvey(user: { userId: number }, rawEnrollmentId: string, body: unknown) {
    const studentId = await requireStudentId(user.userId);
    const courseEnrollmentId = Number(rawEnrollmentId);
    if (!Number.isSafeInteger(courseEnrollmentId) || courseEnrollmentId <= 0) throw enrollmentNotFound();

    const { answers, comment } = parseSurveyPayload(body);

    const enrollment = await studentCoursesRepository.findEnrollmentForSurvey(courseEnrollmentId, studentId);
    if (!enrollment) throw enrollmentNotFound();
    if (enrollment.surveySubmission) {
      throw new AppError(409, "SURVEY_ALREADY_ANSWERED", "Ya respondiste la encuesta de esta cursada.");
    }
    const { periodStartDate, periodEndDate } = enrollment.courseOffering.academicPeriod;
    if (!isSurveyOpen(periodStartDate, periodEndDate, todayAsDate())) {
      throw new AppError(409, "SURVEY_NOT_AVAILABLE", "La encuesta de esta cursada no está disponible en este momento.");
    }

    try {
      await studentCoursesRepository.createSurvey({
        courseEnrollmentId,
        courseOfferingId: enrollment.courseOfferingId,
        answers,
        comment,
      });
    } catch (err) {
      throw mapSurveyError(err);
    }
  },
};
