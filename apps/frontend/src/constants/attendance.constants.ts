import type { AttendanceStatus } from '../types/teacherAttendance.types'

/** Estados que el docente puede cargar al tomar lista, en el orden de los botones. */
export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ['PRESENTE', 'AUSENTE', 'JUSTIFICADO', 'TARDANZA']

/** Mismos pesos que el backend (src/lib/attendance.ts): una tardanza vale media asistencia. */
export const ATTENDANCE_WEIGHT: Record<AttendanceStatus, number> = {
  PRESENTE: 1,
  JUSTIFICADO: 1,
  TARDANZA: 0.5,
  AUSENTE: 0,
}
