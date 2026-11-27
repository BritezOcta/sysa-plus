import { AppError } from "./AppError.js";
import { ENROLLMENT_STATUS } from "../types/academic.js";

/** Encuesta docente fija: el orden define las columnas Q1..Q5 de SURVEY_RESPONSE. */
export const SURVEY_QUESTIONS: readonly string[] = [
  "El docente explica los temas con claridad",
  "Las clases están bien organizadas",
  "El docente está disponible para responder consultas",
  "Las evaluaciones se corresponden con los contenidos dados",
  "Valoración general de la cursada",
];

const MAX_COMMENT_LENGTH = 1000;

export type SurveyAnswers = [number, number, number, number, number];

export type SurveyState = "AVAILABLE" | "ANSWERED" | "NOT_AVAILABLE";

export interface StudentAssessmentDto {
  id: string;
  name: string;
  type: string;
  date: string | null;
  maxScore: number;
  score: number | null;
  isClosed: boolean;
  recoversName: string | null;
}

export interface StudentCourseDto {
  enrollmentId: string;
  subjectCode: string;
  subjectName: string;
  commission: string;
  period: string;
  inProgress: boolean;
  condition: string;
  gradesClosed: boolean;
  assessments: StudentAssessmentDto[];
  survey: SurveyState;
}

/** Misma regla que isInProgress de academicStatus: la cursada sigue hasta el último día del período. */
export function isCourseInProgress(periodEndDate: Date, today: Date): boolean {
  return periodEndDate >= today;
}

/** La encuesta se responde mientras se cursa: desde el inicio hasta el último día del período. */
export function isSurveyOpen(periodStartDate: Date, periodEndDate: Date, today: Date): boolean {
  return periodStartDate <= today && today <= periodEndDate;
}

/** started = el período ya empezó; una inscripción a un cuatrimestre futuro todavía no se está cursando. */
export function conditionLabel(enrollmentStatus: string, inProgress: boolean, started: boolean): string {
  if (inProgress) return started ? "CURSANDO" : ENROLLMENT_STATUS.INSCRIPTO;
  return enrollmentStatus === ENROLLMENT_STATUS.INSCRIPTO ? "SIN CERRAR" : enrollmentStatus;
}

export function surveyState(open: boolean, answered: boolean): SurveyState {
  if (answered) return "ANSWERED";
  return open ? "AVAILABLE" : "NOT_AVAILABLE";
}

export function periodLabel(year: number, semester: number): string {
  return semester === 0 ? `${year} - Anual` : `${year} - ${semester}° Cuat.`;
}

function invalid(message: string): AppError {
  return new AppError(400, "INVALID_SURVEY", message);
}

export function parseSurveyPayload(body: unknown): { answers: SurveyAnswers; comment: string | null } {
  const { answers, comment } = (body ?? {}) as { answers?: unknown; comment?: unknown };
  if (!Array.isArray(answers) || answers.length !== SURVEY_QUESTIONS.length) {
    throw invalid(`Respondé las ${SURVEY_QUESTIONS.length} preguntas de la encuesta.`);
  }
  if (!answers.every((a) => Number.isInteger(a) && a >= 1 && a <= 5)) {
    throw invalid("Cada respuesta debe ser un valor entre 1 y 5.");
  }
  if (comment !== undefined && comment !== null && typeof comment !== "string") {
    throw invalid("El comentario no es válido.");
  }
  const trimmed = typeof comment === "string" ? comment.trim() : "";
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw invalid(`El comentario no puede superar los ${MAX_COMMENT_LENGTH} caracteres.`);
  }
  return { answers: answers as SurveyAnswers, comment: trimmed || null };
}

/** La unique de SURVEY_SUBMISSION corta un segundo envío concurrente: se informa como encuesta ya respondida. */
export function mapSurveyError(err: unknown): unknown {
  if (err && typeof err === "object" && (err as { code?: unknown }).code === "P2002") {
    return new AppError(409, "SURVEY_ALREADY_ANSWERED", "Ya respondiste la encuesta de esta cursada.");
  }
  return err;
}
