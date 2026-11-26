import type { AcademicStatus } from '../types/academicStatus.types'
import { apiRequest } from './httpClient'

/** RF-09: estado académico del alumno autenticado. */
export const academicStatusApi = {
  get(): Promise<AcademicStatus> {
    return apiRequest<AcademicStatus>('/academic-status')
  },
}
