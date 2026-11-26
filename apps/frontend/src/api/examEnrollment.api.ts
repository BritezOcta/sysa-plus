import type { ExamEnrollmentOverview, StudentExamEnrollment } from '../types/examEnrollment.types'
import { apiRequest } from './httpClient'

/** RF-06: inscripción a exámenes finales. */
export const examEnrollmentApi = {
  /** Turno vigente, mesas con la habilitación del alumno y sus inscripciones vigentes. */
  getOverview(): Promise<ExamEnrollmentOverview> {
    return apiRequest<ExamEnrollmentOverview>('/exam-enrollments')
  },

  async enroll(examCallId: number): Promise<StudentExamEnrollment> {
    const { enrollment } = await apiRequest<{ enrollment: StudentExamEnrollment }>('/exam-enrollments', {
      method: 'POST',
      body: { examCallId },
    })
    return enrollment
  },

  async cancel(examEnrollmentId: number): Promise<void> {
    await apiRequest(`/exam-enrollments/${examEnrollmentId}`, { method: 'DELETE' })
  },
}
