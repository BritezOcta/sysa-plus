/**
 * Regla única de asistencia: la usan el cierre de cursada (RF-07), las pantallas del docente,
 * el admin, los reportes y la consulta del alumno (RF-05).
 *
 * % = asistencia ponderada / todas las clases de la comisión. Una clase sin registro del alumno cuenta como falta.
 */
export const ATTENDANCE_STATUS = {
  PRESENTE: "PRESENTE",
  AUSENTE: "AUSENTE",
  JUSTIFICADO: "JUSTIFICADO",
  /** Llegada tarde: vale media asistencia. */
  TARDANZA: "TARDANZA",
} as const;

const WEIGHT: Record<string, number> = {
  [ATTENDANCE_STATUS.PRESENTE]: 1,
  [ATTENDANCE_STATUS.JUSTIFICADO]: 1,
  [ATTENDANCE_STATUS.TARDANZA]: 0.5,
  [ATTENDANCE_STATUS.AUSENTE]: 0,
};

/** Estados que el docente puede cargar al tomar lista. */
export const VALID_ATTENDANCE_STATUSES: ReadonlySet<string> = new Set(Object.values(ATTENDANCE_STATUS));

export function attendanceWeight(status: string | null | undefined): number {
  return (status && WEIGHT[status]) || 0;
}

export function attendedWeight(statuses: readonly (string | null | undefined)[]): number {
  return statuses.reduce((sum, s) => sum + attendanceWeight(s), 0);
}

/** Sin clases dictadas todavía no hay inasistencias: 100%. */
export function attendancePercent(attended: number, totalClasses: number): number {
  if (totalClasses === 0) return 100;
  return Math.round((attended / totalClasses) * 100);
}

export interface AttendanceSummary {
  totalClasses: number;
  presentCount: number;
  justifiedCount: number;
  lateCount: number;
  absentCount: number;
  unrecordedCount: number;
  attendancePercentage: number;
}

/** statusPerClass: un elemento por clase de la comisión; null = el alumno no tiene registro en esa clase. */
export function attendanceSummary(statusPerClass: readonly (string | null)[]): AttendanceSummary {
  const count = (status: string) => statusPerClass.filter((s) => s === status).length;
  return {
    totalClasses: statusPerClass.length,
    presentCount: count(ATTENDANCE_STATUS.PRESENTE),
    justifiedCount: count(ATTENDANCE_STATUS.JUSTIFICADO),
    lateCount: count(ATTENDANCE_STATUS.TARDANZA),
    absentCount: count(ATTENDANCE_STATUS.AUSENTE),
    unrecordedCount: statusPerClass.filter((s) => s === null).length,
    attendancePercentage: attendancePercent(attendedWeight(statusPerClass), statusPerClass.length),
  };
}
