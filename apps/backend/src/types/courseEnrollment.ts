import type { ScheduleSlotDto } from "../lib/schedule.js";
import type { CorrelativityType } from "./academic.js";

/** Respuestas de la API de inscripción a cursadas (RF-04). */

export interface EnrollmentPeriodDto {
  academicPeriodId: number;
  year: number;
  semester: number;
  /** "YYYY-MM-DD" */
  enrollmentStartDate: string;
  /** "YYYY-MM-DD" */
  enrollmentEndDate: string;
  isOpen: boolean;
}

export interface MissingRequirementDto {
  studyPlanSubjectId: number;
  subjectCode: string;
  subjectName: string;
  type: CorrelativityType;
  /** Condición que el alumno debe tener en la materia requerida. */
  requiredCondition: "REGULAR" | "APROBADA";
}

export interface CommissionDto {
  courseOfferingId: number;
  name: string;
  schedules: ScheduleSlotDto[];
  scheduleText: string;
  /** Vacío = sin docente asignado todavía (RF-03). */
  teachers: string[];
  enrolledCount: number;
  capacity: number;
}

export interface AvailableSubjectDto {
  studyPlanSubjectId: number;
  subjectCode: string;
  subjectName: string;
  year: number | null;
  semester: number | null;
  /** Correlatividades para cursar que el alumno todavía no cumple (vacío = habilitado). */
  missingRequirements: MissingRequirementDto[];
  commissions: CommissionDto[];
}

export interface StudentEnrollmentDto {
  courseEnrollmentId: number;
  courseOfferingId: number;
  studyPlanSubjectId: number;
  subjectCode: string;
  subjectName: string;
  commission: string;
  schedules: ScheduleSlotDto[];
  scheduleText: string;
  teachers: string[];
  /** "YYYY-MM-DD" */
  enrollmentDate: string;
}

export interface EnrollmentOverviewDto {
  /** null = no hay ningún período con ventana de inscripción configurada. */
  period: EnrollmentPeriodDto | null;
  student: {
    isActive: boolean;
    careerName: string;
    studyPlan: string;
  };
  subjects: AvailableSubjectDto[];
  enrollments: StudentEnrollmentDto[];
}
