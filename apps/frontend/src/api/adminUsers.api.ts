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
  search(search: string, role: string): Promise<{ users: AdminUserRow[]; limit: number }> {
    const query = new URLSearchParams({ ...(search ? { search } : {}), ...(role ? { role } : {}) })
    return apiRequest(`/admin/users?${query.toString()}`)
  },

  resetPassword(userId: string): Promise<{ temporaryPassword: string; fullName: string; dni: string }> {
    return apiRequest(`/admin/users/${userId}/reset-password`, { method: 'POST' })
  },
}
