import type { Career, EntityStatus, SubjectPeriod } from './academic.types'

export interface CareerFormPayload {
  id?: string
  code: string
  name: string
  studyPlan: string
  durationYears: number
  status: EntityStatus
  description: string
}

export interface SubjectFormPayload {
  id?: string
  careerId: string
  code: string
  name: string
  weeklyHours: number
  totalHours: number
  year: number | null
  period: SubjectPeriod | null
  status: EntityStatus
  enrolledStudents: number
}

export interface CareerFormValues {
  code: string
  name: string
  studyPlan: string
  durationYears: number
  status: EntityStatus
  description: string
}

export interface CareerValidationResult {
  normalizedCode: string
  duplicateCareer: Career | undefined
  codeMissing: boolean
  nameMissing: boolean
  planMissing: boolean
  durationInvalid: boolean
  missingFields: string[]
  codeError: string | null
  planError: string | null
  nameError: string | null
  durationError: string | null
  isValid: boolean
}

export interface SubjectFormValues {
  careerId: string
  code: string
  name: string
  weeklyHours: number
  totalHours: number
  isUnassigned: boolean
  year: number
  period: SubjectPeriod
  status: EntityStatus
  enrolledStudents: number
}

export interface SubjectValidationResult {
  normalizedCode: string
  duplicateSubjectName: string | null
  invalidYearForCareer: boolean
  codeMissing: boolean
  nameMissing: boolean
  weeklyInvalid: boolean
  totalInvalid: boolean
  missingFields: string[]
  codeError: string | null
  nameError: string | null
  weeklyError: string | null
  totalError: string | null
  yearError: string | null
  isValid: boolean
}
