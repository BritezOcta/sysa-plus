import { useNavigate } from 'react-router'
import utnLogo from '../../assets/images/utn-logotipo.svg'
import { APP_ROUTES, AUTH_RULES, INSTITUTION_BRAND } from '../../constants'
import styles from './LoginForm.module.css'

function LoginForm() {
  const navigate = useNavigate()

  async function loginAction() {
    navigate(APP_ROUTES.ACADEMIC_OFFER)
  }

  return (
    <form className={styles.form} action={loginAction}>
      <img
        src={utnLogo}
        alt={INSTITUTION_BRAND.LOGO_ALT}
        className={styles.logo}
      />

      <div className={styles.header}>
        <h1>Bienvenido a {INSTITUTION_BRAND.SYSTEM_NAME}</h1>
        <p>Ingresá tus datos para continuar.</p>
      </div>

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

      <button className={styles.submitButton} type="submit">
        Iniciar sesión
      </button>
    </form>
  )
}

export default LoginForm
