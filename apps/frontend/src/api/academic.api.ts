import type {
  AuditLogEntry,
  Career,
  CareerFormPayload,
  Correlativity,
  CorrelativityType,
  PendingRequirement,
  Subject,
  SubjectFormPayload,
  SubjectPeriod,
} from '../types'
import { apiRequest } from './httpClient'

export interface AcademicSnapshotResponse {
  careers: Career[]
  subjects: Subject[]
  correlativities: Correlativity[]
  auditLogs: AuditLogEntry[]
}

export const academicApi = {
  getSnapshot(): Promise<AcademicSnapshotResponse> {
    return apiRequest<AcademicSnapshotResponse>('/academic/snapshot')
  },

  saveCareer(payload: CareerFormPayload): Promise<{ id: string }> {
    if (payload.id) {
      return apiRequest<{ id: string }>(`/academic/careers/${payload.id}`, {
        method: 'PUT',
        body: payload,
      })
    }
    return apiRequest<{ id: string }>('/academic/careers', {
      method: 'POST',
      body: payload,
    })
  },

  toggleCareerStatus(careerId: string, status: 'active' | 'inactive'): Promise<{ status: 'active' | 'inactive' }> {
    return apiRequest<{ status: 'active' | 'inactive' }>(
      `/academic/careers/${careerId}/status`,
      { method: 'PATCH', body: { status } },
    )
  },

  deleteCareer(careerId: string): Promise<void> {
    return apiRequest<void>(`/academic/careers/${careerId}`, {
      method: 'DELETE',
    })
  },

  saveSubject(
    payload: SubjectFormPayload,
    requirements: PendingRequirement[],
  ): Promise<{ id: string }> {
    if (payload.id) {
      return apiRequest<{ id: string }>(`/academic/subjects/${payload.id}`, {
        method: 'PUT',
        body: { ...payload, requirements },
      })
    }
    return apiRequest<{ id: string }>('/academic/subjects', {
      method: 'POST',
      body: { ...payload, requirements },
    })
  },

  moveSubjectSlot(
    subjectId: string,
    year: number | null,
    period: SubjectPeriod | null,
  ): Promise<void> {
    return apiRequest<void>(`/academic/subjects/${subjectId}/slot`, {
      method: 'PATCH',
      body: { year, period },
    })
  },

  toggleSubjectStatus(
    subjectId: string,
    status?: 'active' | 'inactive',
  ): Promise<{ status: 'active' | 'inactive' }> {
    return apiRequest<{ status: 'active' | 'inactive' }>(
      `/academic/subjects/${subjectId}/status`,
      {
        method: 'PATCH',
        body: status ? { status } : undefined,
      },
    )
  },

  deleteSubject(subjectId: string): Promise<void> {
    return apiRequest<void>(`/academic/subjects/${subjectId}`, {
      method: 'DELETE',
    })
  },

  connectCorrelativity(
    requiresSubjectId: string,
    targetSubjectId: string,
    type: CorrelativityType,
  ): Promise<{ id: string; createdAt: string }> {
    return apiRequest<{ id: string; createdAt: string }>('/academic/correlativities', {
      method: 'POST',
      body: { requiresSubjectId, targetSubjectId, type },
    })
  },

  updateCorrelativityType(
    correlativityId: string,
    type: CorrelativityType,
  ): Promise<void> {
    return apiRequest<void>(`/academic/correlativities/${correlativityId}/type`, {
      method: 'PATCH',
      body: { type },
    })
  },

  removeCorrelativity(correlativityId: string): Promise<void> {
    return apiRequest<void>(`/academic/correlativities/${correlativityId}`, {
      method: 'DELETE',
    })
  },
}
