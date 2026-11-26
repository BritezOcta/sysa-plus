/** RF-09: contrato de la respuesta de GET /api/academic-status. */

/** Condición del alumno en una materia del plan. */
export type SubjectStatus = "APROBADA" | "REGULAR" | "CURSANDO" | "LIBRE" | "DESAPROBADA" | "PENDIENTE";

export interface MissingRequirementDto {
  studyPlanSubjectId: number;
  subjectCode: string;
  subjectName: string;
  requiredCondition: "APROBADA" | "REGULAR";
}

export interface SubjectStatusDto {
  studyPlanSubjectId: number;
  subjectCode: string;
  subjectName: string;
  year: number | null;
  semester: number | null;
  weeklyHours: number | null;
  totalHours: number | null;
  status: SubjectStatus;
  /** Nota del final aprobado. null si se aprobó por promoción (la promoción no guarda nota final) o no está aprobada. */
  grade: number | null;
  /** yyyy-mm-dd: fecha del final aprobado, o fin del cuatrimestre si se promocionó. */
  approvalDate: string | null;
  approvedBy: "FINAL" | "PROMOCION" | null;
  canEnroll: boolean;
  canTakeExam: boolean;
  /** Correlativas que faltan para cursarla (vacío si ya está aprobada, regular o en curso). */
  missingToEnroll: MissingRequirementDto[];
  /** Correlativas que faltan para rendir el final (solo aplica a materias regulares). */
  missingForExam: MissingRequirementDto[];
}

export interface HistoryEntryDto {
  kind: "CURSADA" | "FINAL";
  studyPlanSubjectId: number;
  subjectCode: string;
  subjectName: string;
  /** Cursada: CURSANDO | REGULAR | APROBADA | LIBRE | DESAPROBADA. Final: APROBADO | DESAPROBADO. */
  result: string;
  grade: number | null;
  /** yyyy-mm-dd: fin del cuatrimestre (cursada) o fecha de la mesa (final). */
  date: string;
  /** Ej. "1° cuat. 2025 · 1K1" o "Mesa de diciembre 2025". */
  detail: string;
}

export interface AcademicSummaryDto {
  totalSubjects: number;
  approved: number;
  regular: number;
  inProgress: number;
  /** Sin aprobar ni regularizar ni en curso (incluye libres y desaprobadas). */
  pending: number;
  /** Promedio de los finales aprobados. null si todavía no hay ninguno. */
  average: number | null;
  /** Aprobadas sobre el total de materias activas del plan, 0-100. */
  progressPercent: number;
}

export interface AcademicStatusDto {
  student: { careerName: string; studyPlan: string };
  summary: AcademicSummaryDto;
  subjects: SubjectStatusDto[];
  history: HistoryEntryDto[];
}
