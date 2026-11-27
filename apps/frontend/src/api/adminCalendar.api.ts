import { apiRequest } from './httpClient'

export type WindowStatus = 'ABIERTA' | 'PROXIMA' | 'CERRADA' | 'SIN_DEFINIR'
export type CommissionStatus = 'ABIERTA' | 'CERRADA' | 'CANCELADA'
export type CallStatus = 'ABIERTA' | 'CERRADA'

export interface CalendarOptions {
  careers: { id: string; code: string; name: string; isActive: boolean }[]
  teachers: { id: string; fullName: string }[]
}

export interface PlanSubject {
  id: string
  code: string
  name: string
  year: number | null
  semester: number | null
}

export interface DateRange {
  startDate: string
  endDate: string
  enrollmentStartDate: string
  enrollmentEndDate: string
}

export interface PeriodRow extends DateRange {
  id: string
  year: number
  semester: number
  label: string
  windowStatus: WindowStatus
  commissionsCount: number
}

export interface ScheduleSlotInput {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface CommissionRow {
  id: string
  subjectId: string
  subjectCode: string
  subjectName: string
  year: number | null
  semester: number | null
  code: string
  capacity: number
  enrolled: number
  isFull: boolean
  status: string
  schedule: (ScheduleSlotInput & { dayName: string })[]
  scheduleText: string
}

export interface CommissionInput {
  subjectId?: string
  periodId?: string
  code: string
  capacity: number
  status: CommissionStatus
  schedule: ScheduleSlotInput[]
}

export interface ExamSessionRow extends DateRange {
  id: string
  name: string
  year: number
  status: CallStatus
  windowStatus: WindowStatus
  callsCount: number
}

export interface ExamCallRow {
  id: string
  subjectId: string
  subjectCode: string
  subjectName: string
  year: number | null
  date: string
  time: string
  classroom: string | null
  capacity: number | null
  enrolled: number
  status: CallStatus
  teacher: { id: string; fullName: string } | null
}

export interface ExamCallInput {
  sessionId?: string
  subjectId?: string
  date: string
  time: string
  classroom: string
  capacity: number | null
  teacherId: string | null
  status: CallStatus
}

const BASE = '/admin/calendar'

/** Administrador/Director: ventanas de inscripción, comisiones, turnos y mesas. */
export const adminCalendarApi = {
  options: (): Promise<CalendarOptions> => apiRequest(`${BASE}/options`),
  subjects: (careerId: string): Promise<{ subjects: PlanSubject[] }> => apiRequest(`${BASE}/careers/${careerId}/subjects`),

  periods: (): Promise<{ periods: PeriodRow[] }> => apiRequest(`${BASE}/periods`),
  savePeriod: (id: string | null, body: DateRange & { year?: number; semester?: number }) =>
    apiRequest<{ id: string }>(id ? `${BASE}/periods/${id}` : `${BASE}/periods`, { method: id ? 'PUT' : 'POST', body }),
  commissions: (periodId: string, careerId: string): Promise<{ commissions: CommissionRow[] }> =>
    apiRequest(`${BASE}/periods/${periodId}/commissions?careerId=${careerId}`),
  saveCommission: (id: string | null, body: CommissionInput) =>
    apiRequest<{ id: string }>(id ? `${BASE}/commissions/${id}` : `${BASE}/commissions`, { method: id ? 'PUT' : 'POST', body }),
  deleteCommission: (id: string) => apiRequest<void>(`${BASE}/commissions/${id}`, { method: 'DELETE' }),

  sessions: (): Promise<{ sessions: ExamSessionRow[] }> => apiRequest(`${BASE}/exam-sessions`),
  saveSession: (id: string | null, body: DateRange & { name: string; status: CallStatus }) =>
    apiRequest<{ id: string }>(id ? `${BASE}/exam-sessions/${id}` : `${BASE}/exam-sessions`, { method: id ? 'PUT' : 'POST', body }),
  calls: (sessionId: string, careerId: string): Promise<{ calls: ExamCallRow[] }> =>
    apiRequest(`${BASE}/exam-sessions/${sessionId}/calls?careerId=${careerId}`),
  saveCall: (id: string | null, body: ExamCallInput) =>
    apiRequest<{ id: string }>(id ? `${BASE}/exam-calls/${id}` : `${BASE}/exam-calls`, { method: id ? 'PUT' : 'POST', body }),
  deleteCall: (id: string) => apiRequest<void>(`${BASE}/exam-calls/${id}`, { method: 'DELETE' }),
}
