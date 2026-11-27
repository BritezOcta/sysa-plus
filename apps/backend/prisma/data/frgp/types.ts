/**
 * Formato de los datos reales de UTN FRGP que carga `prisma/seed-frgp.ts`.
 * Fuente: planes, correlatividades y grillas horarias publicadas en https://www.frgp.utn.edu.ar/carreras
 */

/** 0 = anual, 1 = 1er cuatrimestre, 2 = 2do cuatrimestre (mismo criterio que STUDY_PLAN_SUBJECT.SEMESTER). */
export type SeedPeriod = 0 | 1 | 2;

export interface SeedSubject {
  /** Clave interna de la carrera (número de la ordenanza de correlatividades o "E1", "E2"... para electivas). */
  key: string;
  name: string;
  year: number;
  period: SeedPeriod;
  weeklyHours: number;
  /** Si se omite: semanales × 16 (cuatrimestral) o × 32 (anual). */
  totalHours?: number;
  elective?: boolean;
}

export interface SeedCorrelativity {
  target: string;
  /** Deben estar regularizadas (cursadas) para cursar. */
  regular?: string[];
  /** Deben estar aprobadas para cursar. */
  approved?: string[];
}

/** 1 = Lunes ... 6 = Sábado (ISO 8601, igual que COURSE_SCHEDULE.DAY_OF_WEEK). */
export type SeedDay = 1 | 2 | 3 | 4 | 5 | 6;

export interface SeedSlot {
  day: SeedDay;
  start: string;
  end: string;
}

export type SeedShift = "M" | "T" | "N";

export interface SeedOffering {
  subject: string;
  /** Código de comisión tal cual figura en la grilla oficial (ej. "2CN111", "17-11"). */
  commission: string;
  shift: SeedShift;
  /** Cuatrimestre lectivo de la grilla (las anuales se asocian al 1°). */
  semester: 1 | 2;
  slots: SeedSlot[];
  /** Apellidos tal cual la grilla. El primero queda como TITULAR y el resto como AYUDANTE. */
  teachers: string[];
}

export interface SeedCareer {
  code: string;
  name: string;
  studyPlan: string;
  durationYears: number;
  description: string;
  /** Prefijo de los códigos de materia (los códigos son únicos en todo el sistema). */
  subjectPrefix: string;
  subjects: SeedSubject[];
  correlativities: SeedCorrelativity[];
  offerings: SeedOffering[];
  sources: string[];
}

const DAYS = { LU: 1, MA: 2, MI: 3, JU: 4, VI: 5, SA: 6 } as const;

/** Atajo para escribir franjas horarias: slot("LU", "18:00", "22:00"). */
export function slot(day: keyof typeof DAYS, start: string, end: string): SeedSlot {
  return { day: DAYS[day], start, end };
}
