/** RF-09: respuesta de GET /api/academic-status (espejo de backend/src/types/academicStatus.ts). */

export type SubjectStatus = 'APROBADA' | 'REGULAR' | 'CURSANDO' | 'LIBRE' | 'DESAPROBADA' | 'PENDIENTE'

export interface StatusMissingRequirement {
  studyPlanSubjectId: number
  subjectCode: string
  subjectName: string
  requiredCondition: 'APROBADA' | 'REGULAR'
}

/** Correlativa con indicación de si el alumno ya la cumple. */
export interface StatusRequirement extends StatusMissingRequirement {
  met: boolean
}

export interface SubjectStatusRow {
  studyPlanSubjectId: number
  subjectCode: string
  subjectName: string
  year: number | null
  semester: number | null
  weeklyHours: number | null
  totalHours: number | null
  status: SubjectStatus
  grade: number | null
  approvalDate: string | null
  approvedBy: 'FINAL' | 'PROMOCION' | null
  canEnroll: boolean
  canTakeExam: boolean
  missingToEnroll: StatusMissingRequirement[]
  missingForExam: StatusMissingRequirement[]
  requirementsToEnroll: StatusRequirement[]
  requirementsForExam: StatusRequirement[]
}

export interface AcademicHistoryEntry {
  kind: 'CURSADA' | 'FINAL'
  studyPlanSubjectId: number
  subjectCode: string
  subjectName: string
  result: string
  grade: number | null
  date: string
  detail: string
}

export interface AcademicStatus {
  student: { careerName: string; studyPlan: string }
  summary: {
    totalSubjects: number
    approved: number
    regular: number
    inProgress: number
    pending: number
    average: number | null
    progressPercent: number
  }
  subjects: SubjectStatusRow[]
  history: AcademicHistoryEntry[]
}
