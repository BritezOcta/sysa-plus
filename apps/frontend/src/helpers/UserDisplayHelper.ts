import type { AuthUser } from '../types/auth.types'

export function getUserInitials(user: Pick<AuthUser, 'firstName' | 'lastName'>): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
}

export function getUserFullName(user: Pick<AuthUser, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`
}

/** 40123456 → 40.123.456 */
export function formatDni(dni: string): string {
  return dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
