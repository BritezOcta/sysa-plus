export type UserRole = 'ALUMNO' | 'PROFESOR' | 'ADMINISTRADOR'

export interface AuthUser {
  userId: number
  dni: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  /** Solo para ALUMNO */
  legajo: string | null
  /** El Administrador restableció la contraseña: debe cambiarla antes de usar el sistema. */
  mustChangePassword: boolean
}

export interface LoginCredentials {
  dni: string
  password: string
  rememberMe: boolean
}
