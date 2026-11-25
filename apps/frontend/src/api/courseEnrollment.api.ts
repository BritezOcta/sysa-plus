import type { EnrollmentOverview, StudentEnrollment } from '../types/courseEnrollment.types'
import { apiRequest } from './httpClient'

/** RF-04: inscripción a cursadas. */
export const courseEnrollmentApi = {
  /** Período vigente, materias disponibles con sus comisiones y las inscripciones del alumno. */
  getOverview(): Promise<EnrollmentOverview> {
    return apiRequest<EnrollmentOverview>('/course-enrollments')
  },

  async enroll(courseOfferingId: number): Promise<StudentEnrollment> {
    const { enrollment } = await apiRequest<{ enrollment: StudentEnrollment }>('/course-enrollments', {
      method: 'POST',
      body: { courseOfferingId },
    })
    return enrollment
  },

  async cancel(courseEnrollmentId: number): Promise<void> {
    await apiRequest(`/course-enrollments/${courseEnrollmentId}`, { method: 'DELETE' })
  },
}
