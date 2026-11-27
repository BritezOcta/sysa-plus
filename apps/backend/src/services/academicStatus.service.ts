import { AppError } from "../lib/AppError.js";
import { academicStatusRepository as repo } from "../repositories/academicStatus.repository.js";
import { CORRELATIVITY_TYPE, ENROLLMENT_STATUS, FINAL_EXAM_PASSING_GRADE } from "../types/academic.js";
import type {
  AcademicStatusDto,
  HistoryEntryDto,
  MissingRequirementDto,
  SubjectStatus,
  SubjectStatusDto,
} from "../types/academicStatus.js";
import type { AuthUser } from "../types/auth.js";
import { loadStudentContext, todayAsDate, toIsoDate } from "./courseEnrollment.service.js";
import { regularityExpiry } from "./examEnrollment.service.js";

type PlanSubject = Awaited<ReturnType<typeof repo.findPlanSubjects>>[number];
type CourseRecord = Awaited<ReturnType<typeof repo.findCourseEnrollments>>[number];
type ExamRecord = Awaited<ReturnType<typeof repo.findGradedExams>>[number];

/** Lo que se sabe del alumno en una materia, armado a partir de cursadas y finales. */
interface SubjectRecord {
  approvedByFinal: { grade: number; date: Date } | null;
  promotedOn: Date | null;
  regular: boolean;
  /** Fin del cuatrimestre de la regularización más reciente (para su vencimiento, RF-06). */
  regularSince: Date | null;
  inProgress: boolean;
  /** Resultado de la última cursada terminada que no la regularizó. */
  lastFailure: "LIBRE" | "DESAPROBADA" | null;
}

const emptyRecord = (): SubjectRecord => ({
  approvedByFinal: null,
  promotedOn: null,
  regular: false,
  regularSince: null,
  inProgress: false,
  lastFailure: null,
});

/**
 * Una cursada cuyo cuatrimestre no terminó está "en curso", diga lo que diga ENROLLMENT_STATUS:
 * RF-05 escribe REGULAR / EN_RIESGO / LIBRE ahí mientras se toma asistencia, y eso es
 * una condición parcial, no el cierre de la cursada.
 */
function isInProgress(course: CourseRecord, today: Date): boolean {
  return course.courseOffering.academicPeriod.periodEndDate >= today;
}

function buildRecords(courses: CourseRecord[], exams: ExamRecord[], today: Date): Map<number, SubjectRecord> {
  const records = new Map<number, SubjectRecord>();
  const recordFor = (id: number) => {
    let r = records.get(id);
    if (!r) records.set(id, (r = emptyRecord()));
    return r;
  };

  // Cursadas terminadas en orden cronológico, para que "lastFailure" sea la más reciente.
  const sorted = [...courses].sort(
    (a, b) => a.courseOffering.academicPeriod.periodEndDate.getTime() - b.courseOffering.academicPeriod.periodEndDate.getTime(),
  );
  for (const course of sorted) {
    const r = recordFor(course.courseOffering.studyPlanSubjectId);
    if (isInProgress(course, today)) {
      r.inProgress = true;
      continue;
    }
    switch (course.enrollmentStatus) {
      case ENROLLMENT_STATUS.APROBADA:
        r.promotedOn = course.courseOffering.academicPeriod.periodEndDate;
        break;
      case ENROLLMENT_STATUS.REGULAR:
        r.regular = true;
        // Recorrido cronológico: queda la regularización más reciente.
        r.regularSince = course.courseOffering.academicPeriod.periodEndDate;
        break;
      case ENROLLMENT_STATUS.LIBRE:
      case ENROLLMENT_STATUS.DESAPROBADA:
        r.lastFailure = course.enrollmentStatus;
        break;
      // INSCRIPTO / EN_RIESGO en un cuatrimestre ya cerrado: la cursada nunca se cerró (RF-07 pendiente).
      // No se puede afirmar nada, así que no cambia la condición.
    }
  }

  for (const exam of exams) {
    const grade = Number(exam.examGrade);
    if (grade < FINAL_EXAM_PASSING_GRADE) continue;
    const r = recordFor(exam.examCall.studyPlanSubjectId);
    // Si hay más de un final aprobado (no debería), vale el más reciente.
    if (!r.approvedByFinal || exam.examCall.callDate > r.approvedByFinal.date) {
      r.approvedByFinal = { grade, date: exam.examCall.callDate };
    }
  }
  return records;
}

function statusOf(r: SubjectRecord | undefined): SubjectStatus {
  if (!r) return "PENDIENTE";
  if (r.approvedByFinal || r.promotedOn) return "APROBADA";
  if (r.inProgress) return "CURSANDO";
  if (r.regular) return "REGULAR";
  return r.lastFailure ?? "PENDIENTE";
}

function toMissing(req: PlanSubject["requirements"][number], requiredCondition: "APROBADA" | "REGULAR"): MissingRequirementDto {
  return {
    studyPlanSubjectId: req.requiredSubject.studyPlanSubjectId,
    subjectCode: req.requiredSubject.subject.subjectCode,
    subjectName: req.requiredSubject.subject.subjectName,
    requiredCondition,
  };
}

/** RF-09 Error Handling: una correlativa que apunta a otro plan es un dato roto, no un requisito. */
function assertConsistentCorrelativities(subjects: PlanSubject[], studyPlanId: number) {
  for (const sps of subjects) {
    const broken = sps.requirements.find((req) => req.requiredSubject.studyPlanId !== studyPlanId);
    if (broken) {
      throw new AppError(
        409,
        "CORRELATIVITY_INCONSISTENCY",
        `Hay una inconsistencia en las correlatividades de ${sps.subject.subjectName}. Comunicate con la Dirección.`,
        { studyPlanSubjectId: sps.studyPlanSubjectId },
      );
    }
  }
}

function courseResultLabel(course: CourseRecord, today: Date): string {
  if (isInProgress(course, today)) return "CURSANDO";
  return course.enrollmentStatus === ENROLLMENT_STATUS.INSCRIPTO ? "SIN CERRAR" : course.enrollmentStatus;
}

function buildHistory(courses: CourseRecord[], exams: ExamRecord[], today: Date): HistoryEntryDto[] {
  const entries: HistoryEntryDto[] = [
    ...courses.map((course): HistoryEntryDto => {
      const { academicPeriod: period, studyPlanSubject, studyPlanSubjectId, commission } = course.courseOffering;
      return {
        kind: "CURSADA",
        studyPlanSubjectId,
        subjectCode: studyPlanSubject.subject.subjectCode,
        subjectName: studyPlanSubject.subject.subjectName,
        result: courseResultLabel(course, today),
        grade: null,
        date: toIsoDate(period.periodEndDate),
        detail: `${period.semester}° cuat. ${period.year} · ${commission}`,
      };
    }),
    ...exams.map((exam): HistoryEntryDto => {
      const grade = Number(exam.examGrade);
      return {
        kind: "FINAL",
        studyPlanSubjectId: exam.examCall.studyPlanSubjectId,
        subjectCode: exam.examCall.studyPlanSubject.subject.subjectCode,
        subjectName: exam.examCall.studyPlanSubject.subject.subjectName,
        result: grade >= FINAL_EXAM_PASSING_GRADE ? "APROBADO" : "DESAPROBADO",
        grade,
        date: toIsoDate(exam.examCall.callDate),
        detail: exam.examCall.examSession.examName,
      };
    }),
  ];
  // Más reciente primero.
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export const academicStatusService = {
  /** RF-09: materias cursadas y rendidas, condición, correlatividades y avance en el plan. */
  async getStatus(user: AuthUser): Promise<AcademicStatusDto> {
    const context = await loadStudentContext(user.userId);
    const today = todayAsDate();

    const [planSubjects, courses, exams] = await Promise.all([
      repo.findPlanSubjects(context.studyPlanId),
      repo.findCourseEnrollments(context.studentCareerId),
      repo.findGradedExams(context.studentCareerId),
    ]);
    assertConsistentCorrelativities(planSubjects, context.studyPlanId);

    const records = buildRecords(courses, exams, today);
    const statusById = new Map(planSubjects.map((sps) => [sps.studyPlanSubjectId, statusOf(records.get(sps.studyPlanSubjectId))]));
    // Una correlativa inactiva (fuera de statusById) cuenta como no cumplida.
    const isApproved = (id: number) => statusById.get(id) === "APROBADA";
    const isRegularOrApproved = (id: number) => isApproved(id) || statusById.get(id) === "REGULAR";

    const subjects: SubjectStatusDto[] = planSubjects.map((sps) => {
      const status = statusById.get(sps.studyPlanSubjectId)!;
      const record = records.get(sps.studyPlanSubjectId);

      const missingToEnroll: MissingRequirementDto[] = [];
      const missingForExam: MissingRequirementDto[] = [];
      for (const req of sps.requirements) {
        const id = req.requiredSubject.studyPlanSubjectId;
        switch (req.correlativityType) {
          case CORRELATIVITY_TYPE.APPROVED_TO_ENROLL:
            if (!isApproved(id)) missingToEnroll.push(toMissing(req, "APROBADA"));
            break;
          case CORRELATIVITY_TYPE.REGULAR_TO_ENROLL:
            if (!isRegularOrApproved(id)) missingToEnroll.push(toMissing(req, "REGULAR"));
            break;
          case CORRELATIVITY_TYPE.APPROVED_FOR_EXAM:
            if (!isApproved(id)) missingForExam.push(toMissing(req, "APROBADA"));
            break;
        }
      }

      const canBeTaken = status === "PENDIENTE" || status === "LIBRE" || status === "DESAPROBADA";
      // Mismo criterio que la inscripción a mesas (RF-06): con la regularidad vencida no se rinde como regular.
      const regularityValid = !!record?.regularSince && regularityExpiry(record.regularSince) >= today;
      return {
        studyPlanSubjectId: sps.studyPlanSubjectId,
        subjectCode: sps.subject.subjectCode,
        subjectName: sps.subject.subjectName,
        year: sps.subjectYear,
        semester: sps.semester,
        weeklyHours: sps.weeklyHours,
        totalHours: sps.totalHours,
        status,
        grade: record?.approvedByFinal?.grade ?? null,
        approvalDate:
          status !== "APROBADA"
            ? null
            : toIsoDate(record!.approvedByFinal?.date ?? record!.promotedOn!),
        approvedBy: status !== "APROBADA" ? null : record!.approvedByFinal ? "FINAL" : "PROMOCION",
        canEnroll: canBeTaken && missingToEnroll.length === 0,
        canTakeExam: status === "REGULAR" && regularityValid && missingForExam.length === 0,
        missingToEnroll: canBeTaken ? missingToEnroll : [],
        missingForExam: status === "REGULAR" ? missingForExam : [],
      };
    });

    const count = (s: SubjectStatus) => subjects.filter((x) => x.status === s).length;
    const approved = count("APROBADA");
    const finalGrades = subjects.map((x) => x.grade).filter((g): g is number => g !== null);

    return {
      student: { careerName: context.careerName, studyPlan: context.studyPlanResolution },
      summary: {
        totalSubjects: subjects.length,
        approved,
        regular: count("REGULAR"),
        inProgress: count("CURSANDO"),
        pending: count("PENDIENTE") + count("LIBRE") + count("DESAPROBADA"),
        average: finalGrades.length ? finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length : null,
        progressPercent: subjects.length ? Math.round((approved / subjects.length) * 100) : 0,
      },
      subjects,
      history: buildHistory(courses, exams, today),
    };
  },
};
