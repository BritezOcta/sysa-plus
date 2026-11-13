
import styles from './LoginForm.module.css'
import utnLogo from '../../assets/images/utn-logotipo.svg'

async function loginAction(_formData: FormData) {
    // TODO: completar esto conectarlo con el back y auth xd
}

function LoginForm() {
  return (
    <form className={styles.form} action={loginAction}>
      <img
        src={utnLogo}
        alt="Logo de la Universidad Tecnológica Nacional"
        className={styles.logo}
      />

      <div className={styles.header}>
        <h1>Bienvenido a SysA+</h1>
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
          pattern="[0-9]{7,8}"
          maxLength={8}
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
