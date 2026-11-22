import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../api/auth.api'
import type { AuthUser, LoginCredentials } from '../types/auth.types'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  /** true justo después de un login, hasta que se muestra la bienvenida. */
  welcomePending: boolean
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  logout: () => Promise<void>
  acknowledgeWelcome: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [welcomePending, setWelcomePending] = useState(false)
  const acknowledgeWelcome = useCallback(() => setWelcomePending(false), [])

  // Restaura la sesión desde la cookie httpOnly al cargar la app.
  useEffect(() => {
    let cancelled = false
    authApi
      .me()
      .then((current) => {
        if (cancelled) return
        setUser(current)
        setStatus(current ? 'authenticated' : 'anonymous')
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function login(credentials: LoginCredentials) {
    const loggedUser = await authApi.login(credentials)
    setUser(loggedUser)
    setStatus('authenticated')
    setWelcomePending(true)
    return loggedUser
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      // Aunque falle la red, se descarta la sesión en el cliente.
      setUser(null)
      setStatus('anonymous')
      setWelcomePending(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        welcomePending,
        login,
        logout,
        acknowledgeWelcome,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return context
}

/** Para pantallas que solo se renderizan dentro de una ruta protegida. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuthenticatedUser(): AuthUser {
  const { user } = useAuth()
  if (!user) throw new Error('useAuthenticatedUser requiere una sesión iniciada')
  return user
}
