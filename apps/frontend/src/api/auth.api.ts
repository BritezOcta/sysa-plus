import type { AuthUser, LoginCredentials } from '../types/auth.types'
import { ApiError, apiRequest } from './httpClient'

interface UserResponse {
  user: AuthUser
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const { user } = await apiRequest<UserResponse>('/auth/login', {
      method: 'POST',
      body: credentials,
    })
    return user
  },

  async logout(): Promise<void> {
    await apiRequest('/auth/logout', { method: 'POST' })
  },

  /** Devuelve el usuario de la sesión actual, o null si no hay sesión válida. */
  async me(): Promise<AuthUser | null> {
    try {
      const { user } = await apiRequest<UserResponse>('/auth/me')
      return user
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
}
