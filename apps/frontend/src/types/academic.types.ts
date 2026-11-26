export type EntityStatus = 'active' | 'inactive'

export type SubjectPeriod = 1 | 2 | 'anual'

export type CorrelativityType =
  | 'regularizada_cursar'
  | 'aprobada_cursar'
  | 'aprobada_rendir'

export interface Career {
  id: string
  code: string
  name: string
  studyPlan: string
  durationYears: number
  status: EntityStatus
  description: string
  updatedAt: string
}

export interface Subject {
  id: string
  careerId: string
  code: string
  name: string
  weeklyHours: number
  totalHours: number
  year: number | null
  period: SubjectPeriod | null
  status: EntityStatus
  enrolledStudents: number
  /** RF-07: nota mínima de cada parcial para regularizar (0-10). */
  regularGrade: number
  /** RF-07: nota mínima de cada parcial para promocionar. null = sin promoción. */
  promotionGrade: number | null
}

export interface Correlativity {
  id: string
  careerId: string
  subjectId: string
  requiresSubjectId: string
  type: CorrelativityType
  createdAt: string
}
