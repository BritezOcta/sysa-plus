import { apiRequest } from './httpClient'

export type SurveyState = 'AVAILABLE' | 'ANSWERED' | 'NOT_AVAILABLE'

export interface StudentAssessment {
  id: string
  name: string
  type: string
  date: string | null
  maxScore: number
  score: number | null
  /** true = el docente cerró la evaluación: la nota es definitiva. */
  isClosed: boolean
  /** Solo recuperatorios: nombre del parcial que recupera. */
  recoversName: string | null
}

export interface StudentCourse {
  enrollmentId: string
  subjectCode: string
  subjectName: string
  commission: string
  period: string
  inProgress: boolean
  /** CURSANDO | REGULAR | APROBADA | LIBRE | DESAPROBADA | SIN CERRAR */
  condition: string
  gradesClosed: boolean
  assessments: StudentAssessment[]
  survey: SurveyState
}

export const studentCoursesApi = {
  getMyCourses(): Promise<{ questions: string[]; courses: StudentCourse[] }> {
    return apiRequest<{ questions: string[]; courses: StudentCourse[] }>('/student/courses')
  },

  async submitSurvey(enrollmentId: string, answers: number[], comment: string | null): Promise<void> {
    await apiRequest(`/student/courses/${enrollmentId}/survey`, {
      method: 'POST',
      body: { answers, comment },
    })
  },
}
