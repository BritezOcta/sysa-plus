import { apiRequest } from './httpClient'

export interface AdminUserRow {
  id: string
  dni: string
  fullName: string
  email: string
  role: 'ALUMNO' | 'PROFESOR' | 'ADMINISTRADOR'
  legajo: string | null
  isActive: boolean
  mustChangePassword: boolean
  isLocked: boolean
  lastLoginAt: string | null
}

/** Administrador/Director: usuarios y restablecimiento de contraseña. */
export const adminUsersApi = {
  search(search: string, role: string, status: '' | 'active' | 'inactive'): Promise<{ users: AdminUserRow[]; limit: number }> {
    const query = new URLSearchParams({ ...(search ? { search } : {}), ...(role ? { role } : {}), ...(status ? { status } : {}) })
    return apiRequest(`/admin/users?${query.toString()}`)
  },

  /** RF-10: dar de baja o reactivar a un alumno. */
  setStatus(
    userId: string,
    status: 'active' | 'inactive',
    reason: string,
  ): Promise<{ id: string; isActive: boolean; cancelledCourses: number; cancelledExams: number }> {
    return apiRequest(`/admin/users/${userId}/status`, { method: 'PATCH', body: { status, reason } })
  },

  resetPassword(userId: string): Promise<{ temporaryPassword: string; fullName: string; dni: string }> {
    return apiRequest(`/admin/users/${userId}/reset-password`, { method: 'POST' })
  },
}
