import type { MissingRequirement } from './courseEnrollment.types'

/** RF-06: respuesta de /api/exam-enrollments (espejo de backend/src/types/examEnrollment.ts). */

export interface ExamSession {
  examSessionId: number
  name: string
  /** "YYYY-MM-DD" */
  enrollmentStartDate: string
  /** "YYYY-MM-DD" */
  enrollmentEndDate: string
  isOpen: boolean
}

export type ExamIneligibilityCode =
  | 'NOT_REGULAR'
  | 'REGULARITY_EXPIRED'
  | 'CORRELATIVITIES_NOT_MET'
  | 'ALREADY_ENROLLED_IN_SUBJECT'
  | 'CALL_FULL'

export interface ExamCall {
  examCallId: number
  studyPlanSubjectId: number
  subjectCode: string
  subjectName: string
  year: number | null
  callNumber: number
  /** "YYYY-MM-DD" */
  date: string
  /** "HH:MM" */
  time: string
  classroom: string | null
  teacher: string | null
  capacity: number | null
  enrolledCount: number
  /** null = habilitado (o ya inscripto a esta mesa). */
  ineligibility: { code: ExamIneligibilityCode; message: string } | null
  missingRequirements: MissingRequirement[]
}

export interface StudentExamEnrollment {
  examEnrollmentId: number
  enrollmentCode: string
  examCallId: number
  studyPlanSubjectId: number
  subjectCode: string
  subjectName: string
  sessionName: string
  /** "YYYY-MM-DD" */
  date: string
  /** "HH:MM" */
  time: string
  classroom: string | null
  teacher: string | null
  canCancel: boolean
}

export interface ExamEnrollmentOverview {
  session: ExamSession | null
  student: { isActive: boolean; careerName: string; studyPlan: string }
  calls: ExamCall[]
  enrollments: StudentExamEnrollment[]
}
