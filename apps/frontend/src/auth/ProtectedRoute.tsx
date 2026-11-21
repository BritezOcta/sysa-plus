import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { APP_ROUTES, ROLE_HOME_ROUTES } from '../constants'
import type { UserRole } from '../types/auth.types'
import { useAuth } from './AuthContext'
import styles from './AuthScreens.module.css'

export function SessionLoading() {
  return (
    <div className={styles.fullscreenCenter} role="status">
      Verificando sesión…
    </div>
  )
}

interface ProtectedRouteProps {
  roles: readonly UserRole[]
  children: ReactNode
}

/**
 * Sin sesión → login. Con sesión pero otro rol → la vista principal de su rol,
 * así cada usuario opera solo dentro de su ámbito de permisos.
 */
export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <SessionLoading />

  if (!user) {
    return <Navigate to={APP_ROUTES.LOGIN} replace state={{ from: location.pathname }} />
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME_ROUTES[user.role]} replace />
  }

  return <>{children}</>
}

/** Para "/" y "/login": si ya hay sesión, lleva a la vista principal del rol. */
export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()

  if (status === 'loading') return <SessionLoading />
  if (user) return <Navigate to={ROLE_HOME_ROUTES[user.role]} replace />

  return <>{children}</>
}
