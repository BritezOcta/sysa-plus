import type { MissingRequirementDto } from "./courseEnrollment.js";

/** Respuestas de la API de inscripción a exámenes finales (RF-06). */

export interface ExamSessionDto {
  examSessionId: number;
  name: string;
  /** "YYYY-MM-DD" */
  enrollmentStartDate: string;
  /** "YYYY-MM-DD" */
  enrollmentEndDate: string;
  isOpen: boolean;
}

/** Por qué el alumno no puede inscribirse a una mesa. */
export type ExamIneligibilityCode =
  | "NOT_REGULAR"
  | "REGULARITY_EXPIRED"
  | "CORRELATIVITIES_NOT_MET"
  | "ALREADY_ENROLLED_IN_SUBJECT"
  | "CALL_FULL";

export interface ExamCallDto {
  examCallId: number;
  studyPlanSubjectId: number;
  subjectCode: string;
  subjectName: string;
  year: number | null;
  /** 1° / 2° llamado de la materia dentro del turno. */
  callNumber: number;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  time: string;
  /** null = a confirmar. */
  classroom: string | null;
  /** null = a designar. */
  teacher: string | null;
  /** null = sin límite de inscriptos. */
  capacity: number | null;
  enrolledCount: number;
  /** null = habilitado para inscribirse (o ya inscripto a esta mesa). */
  ineligibility: { code: ExamIneligibilityCode; message: string } | null;
  /** Correlativas para rendir que faltan aprobar. */
  missingRequirements: MissingRequirementDto[];
}

export interface StudentExamEnrollmentDto {
  examEnrollmentId: number;
  /** Código de inscripción que se le informa al alumno. */
  enrollmentCode: string;
  examCallId: number;
  studyPlanSubjectId: number;
  subjectCode: string;
  subjectName: string;
  sessionName: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  time: string;
  classroom: string | null;
  teacher: string | null;
  /** Se puede dar de baja mientras la inscripción de su turno esté abierta. */
  canCancel: boolean;
}

export interface ExamEnrollmentOverviewDto {
  /** null = no hay ningún turno con ventana de inscripción configurada. */
  session: ExamSessionDto | null;
  student: {
    isActive: boolean;
    careerName: string;
    studyPlan: string;
  };
  calls: ExamCallDto[];
  /** Inscripciones vigentes a mesas que todavía no se tomaron, de cualquier turno. */
  enrollments: StudentExamEnrollmentDto[];
}
