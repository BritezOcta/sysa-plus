/**
 * Valores de negocio compartidos entre requerimientos. Son el "contrato" en la base
 * de datos: otros RF escriben estos mismos valores (ej. RF-07 pasa una cursada a
 * REGULAR / APROBADA), así que no se deben cambiar sin migrar los datos.
 */

/** COURSE_ENROLLMENT.ENROLLMENT_STATUS */
export const ENROLLMENT_STATUS = {
  /** Inscripción vigente a la cursada (RF-04). */
  INSCRIPTO: "INSCRIPTO",
  /** El alumno canceló la inscripción (RF-04) o fue dado de baja (RF-10). */
  CANCELADA: "CANCELADA",
  // Estados finales de la cursada: los escribe RF-07 (carga de notas) / RF-05 (asistencias).
  REGULAR: "REGULAR",
  APROBADA: "APROBADA",
  LIBRE: "LIBRE",
  DESAPROBADA: "DESAPROBADA",
} as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUS)[keyof typeof ENROLLMENT_STATUS];

/** SUBJECT_CORRELATIVITY.CORRELATIVITY_TYPE (mismos valores que usa el frontend de RF-02). */
export const CORRELATIVITY_TYPE = {
  REGULAR_TO_ENROLL: "regularizada_cursar",
  APPROVED_TO_ENROLL: "aprobada_cursar",
  APPROVED_FOR_EXAM: "aprobada_rendir",
} as const;

export type CorrelativityType = (typeof CORRELATIVITY_TYPE)[keyof typeof CORRELATIVITY_TYPE];

/** COURSE_OFFERING.OFFERING_STATUS */
export const OFFERING_STATUS = {
  /** La comisión acepta inscripciones. */
  ABIERTA: "ABIERTA",
  CERRADA: "CERRADA",
} as const;

/**
 * Nota mínima de un final para considerar la materia aprobada.
 * TODO(RF-07): el PDF habla de "criterios de aprobación configurados por materia";
 * cuando exista esa configuración, reemplazar esta constante.
 */
export const FINAL_EXAM_PASSING_GRADE = 6;
