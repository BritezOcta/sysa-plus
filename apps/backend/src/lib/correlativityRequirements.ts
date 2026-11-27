import { CORRELATIVITY_TYPE } from "../types/academic.js";
import type { RequirementDto, SubjectStatus } from "../types/academicStatus.js";

export interface PlanRequirement {
  correlativityType: string;
  requiredSubject: { studyPlanSubjectId: number; subject: { subjectCode: string; subjectName: string } };
}

/**
 * Evalúa cada correlativa contra el estado del alumno en la materia requerida.
 * Una correlativa fuera del plan activo (estado desconocido) cuenta como no cumplida.
 */
export function evaluateRequirements(
  requirements: PlanRequirement[],
  statusOf: (studyPlanSubjectId: number) => SubjectStatus | undefined,
): { toEnroll: RequirementDto[]; forExam: RequirementDto[] } {
  const toEnroll: RequirementDto[] = [];
  const forExam: RequirementDto[] = [];

  for (const req of requirements) {
    const { studyPlanSubjectId, subject } = req.requiredSubject;
    const status = statusOf(studyPlanSubjectId);
    const approved = status === "APROBADA";
    const dto = (requiredCondition: "APROBADA" | "REGULAR", met: boolean): RequirementDto => ({
      studyPlanSubjectId,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      requiredCondition,
      met,
    });

    switch (req.correlativityType) {
      case CORRELATIVITY_TYPE.APPROVED_TO_ENROLL:
        toEnroll.push(dto("APROBADA", approved));
        break;
      case CORRELATIVITY_TYPE.REGULAR_TO_ENROLL:
        toEnroll.push(dto("REGULAR", approved || status === "REGULAR"));
        break;
      case CORRELATIVITY_TYPE.APPROVED_FOR_EXAM:
        forExam.push(dto("APROBADA", approved));
        break;
    }
  }

  return { toEnroll, forExam };
}
