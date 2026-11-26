import { apiRequest } from './httpClient'

export type AssignmentRole = 'TITULAR' | 'AYUDANTE'
export type OfferingStatus = 'ABIERTA' | 'CERRADA' | 'CANCELADA' | 'LLENA'

export interface AssignmentCareerOption {
  id: string
  code: string
  name: string
  durationYears: number
  isActive: boolean
}

export interface AssignmentPeriodOption {
  id: string
  year: number
  semester: number
  label: string
  isCurrent: boolean
}

export interface TeacherOption {
  id: string
  fullName: string
  dni: string
  email: string
  /** Usuario PROFESOR activo: solo estos se pueden asignar (RF-03). */
  isActive: boolean
}

export interface AssignmentOptions {
  careers: AssignmentCareerOption[]
  periods: AssignmentPeriodOption[]
  defaultPeriodId: string
  teachers: TeacherOption[]
}

export interface ScheduleSlot {
  dayOfWeek: number
  dayName: string
  startTime: string
  endTime: string
}

export interface AssignedTeacher {
  assignmentId: string
  teacherId: string
  fullName: string
  role: AssignmentRole
  isActive: boolean
}

export interface CommissionWithTeachers {
  id: string
  code: string
  capacity: number
  status: OfferingStatus
  enrolledCount: number
  schedule: ScheduleSlot[]
  scheduleText: string
  teachers: AssignedTeacher[]
}

export interface SubjectWithCommissions {
  id: string
  code: string
  name: string
  year: number | null
  period: 1 | 2 | 'anual' | null
  isActive: boolean
  commissions: CommissionWithTeachers[]
}

export interface CommissionsResponse {
  career: { id: string; code: string; name: string; durationYears: number }
  period: { id: string; label: string }
  subjects: SubjectWithCommissions[]
}

export interface TeacherLoadItem {
  assignmentId: string
  role: AssignmentRole
  commissionId: string
  commission: string
  status: OfferingStatus
  period: string
  careerName: string
  subjectCode: string
  subjectName: string
  scheduleText: string
}

export interface TeacherLoadResponse {
  teacher: { id: string; fullName: string; isActive: boolean }
  assignments: TeacherLoadItem[]
}

const BASE = '/admin/teacher-assignments'

/** RF-03: asignación de docentes a comisiones (Administrador/Director). */
export const teacherAssignmentApi = {
  getOptions(): Promise<AssignmentOptions> {
    return apiRequest<AssignmentOptions>(`${BASE}/options`)
  },

  getCommissions(careerId: string, periodId: string): Promise<CommissionsResponse> {
    const query = new URLSearchParams({ careerId, periodId })
    return apiRequest<CommissionsResponse>(`${BASE}/commissions?${query.toString()}`)
  },

  getTeacherLoad(teacherId: string): Promise<TeacherLoadResponse> {
    return apiRequest<TeacherLoadResponse>(`${BASE}/teachers/${teacherId}`)
  },

  assign(courseOfferingId: string, teacherId: string, role: AssignmentRole): Promise<{ assignmentId: string; warnings: string[] }> {
    return apiRequest(`${BASE}`, { method: 'POST', body: { courseOfferingId, teacherId, role } })
  },

  changeRole(assignmentId: string, role: AssignmentRole): Promise<{ role: AssignmentRole }> {
    return apiRequest(`${BASE}/${assignmentId}`, { method: 'PATCH', body: { role } })
  },

  unassign(assignmentId: string): Promise<void> {
    return apiRequest<void>(`${BASE}/${assignmentId}`, { method: 'DELETE' })
  },
}
