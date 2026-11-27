import { ENROLLMENT_STATUS, MIN_ATTENDANCE_PERCENT } from "../types/academic.js";

/** Un parcial de la cursada, con la nota del alumno y la de su recuperatorio (si existe). */
export interface ParcialResult {
  maxScore: number;
  /** null = el alumno no tiene nota cargada (ausente). */
  score: number | null;
  /** Nota máxima del recuperatorio de este parcial. null = el parcial no tiene recuperatorio. */
  recoveryMaxScore: number | null;
  /** Nota del alumno en el recuperatorio. null = no lo rindió. */
  recoveryScore: number | null;
}

export interface CourseConditionInput {
  attendancePercent: number;
  parciales: ParcialResult[];
  /** Nota mínima de cada parcial para regularizar (escala 0-10). */
  regularGrade: number;
  /** Nota mínima de cada parcial para promocionar (escala 0-10). null = sin promoción. */
  promotionGrade: number | null;
}

export type CourseCondition =
  | typeof ENROLLMENT_STATUS.APROBADA
  | typeof ENROLLMENT_STATUS.REGULAR
  | typeof ENROLLMENT_STATUS.DESAPROBADA
  | typeof ENROLLMENT_STATUS.LIBRE;

/** Nota efectiva de un parcial en escala 0-10: si rindió el recuperatorio, ese lo reemplaza. */
function effectiveGrade(p: ParcialResult): number | null {
  if (p.recoveryScore !== null && p.recoveryMaxScore !== null) {
    return (p.recoveryScore / p.recoveryMaxScore) * 10;
  }
  return p.score === null ? null : (p.score / p.maxScore) * 10;
}

/**
 * RF-07: condición final de la cursada.
 * Asistencia bajo el mínimo → LIBRE. Si no, cada parcial (o su recuperatorio) debe alcanzar
 * la nota: todos ≥ promoción → APROBADA, todos ≥ regularización → REGULAR, si no → DESAPROBADA.
 */
export function computeCourseCondition(input: CourseConditionInput): CourseCondition {
  if (input.attendancePercent < MIN_ATTENDANCE_PERCENT) return ENROLLMENT_STATUS.LIBRE;

  const grades = input.parciales.map(effectiveGrade);
  if (grades.length === 0 || grades.some((g) => g === null || g < input.regularGrade)) {
    return ENROLLMENT_STATUS.DESAPROBADA;
  }
  const promotion = input.promotionGrade;
  if (promotion !== null && grades.every((g) => g !== null && g >= promotion)) {
    return ENROLLMENT_STATUS.APROBADA;
  }
  return ENROLLMENT_STATUS.REGULAR;
}
