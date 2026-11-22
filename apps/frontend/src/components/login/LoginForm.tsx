import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError, NetworkError } from '../../api/httpClient'
import utnLogo from '../../assets/images/utn-logotipo.svg'
import { useAuth } from '../../auth/AuthContext'
import { AUTH_RULES, INSTITUTION_BRAND, ROLE_HOME_ROUTES } from '../../constants'
import type { LoginCredentials } from '../../types/auth.types'
import styles from './LoginForm.module.css'

interface LoginErrorState {
  message: string
  /** Error de conexión: se ofrece reintentar con los mismos datos. */
  canRetry: boolean
}

const GENERIC_NETWORK_ERROR =
  'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá nuevamente.'

function toErrorState(error: unknown): LoginErrorState {
  if (error instanceof ApiError) return { message: error.message, canRetry: false }
  if (error instanceof NetworkError) return { message: GENERIC_NETWORK_ERROR, canRetry: true }
  return { message: GENERIC_NETWORK_ERROR, canRetry: true }
}

function LoginForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState<LoginErrorState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lastCredentials, setLastCredentials] = useState<LoginCredentials | null>(null)

  async function attemptLogin(credentials: LoginCredentials) {
    setSubmitting(true)
    setError(null)
    setLastCredentials(credentials)
    try {
      const user = await login(credentials)
      navigate(ROLE_HOME_ROUTES[user.role], { replace: true })
    } catch (err) {
      setError(toErrorState(err))
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(form: HTMLFormElement) {
    const data = new FormData(form)
    const dni = String(data.get('dni') ?? '').trim()
    const password = String(data.get('password') ?? '')

    if (!dni || !password) {
      setError({ message: 'Completá el usuario y la contraseña para continuar.', canRetry: false })
      return
    }

    void attemptLogin({ dni, password, rememberMe: data.get('rememberMe') === 'on' })
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit(event.currentTarget)
      }}
      noValidate
    >
      <img
        src={utnLogo}
        alt={INSTITUTION_BRAND.LOGO_ALT}
        className={styles.logo}
      />

      <div className={styles.header}>
        <h1>Bienvenido a {INSTITUTION_BRAND.SYSTEM_NAME}</h1>
        <p>Ingresá tus datos para continuar.</p>
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          <span>{error.message}</span>
          {error.canRetry && lastCredentials && (
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => void attemptLogin(lastCredentials)}
              disabled={submitting}
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="dni">DNI</label>
        <input
          id="dni"
          name="dni"
          type="text"
          placeholder="Ingresá tu DNI"
          inputMode="numeric"
          autoComplete="username"
          pattern={AUTH_RULES.DNI_PATTERN}
          maxLength={AUTH_RULES.DNI_MAX_LENGTH}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Ingresá tu contraseña"
          autoComplete="current-password"
          required
        />
      </div>

      <label className={styles.rememberMe}>
        <input type="checkbox" name="rememberMe" />
        Recordarme
      </label>

      <button className={styles.submitButton} type="submit" disabled={submitting}>
        {submitting ? 'Ingresando…' : 'Iniciar sesión'}
      </button>
    </form>
  )
}

export default LoginForm
