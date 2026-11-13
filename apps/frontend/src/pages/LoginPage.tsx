
import LoginForm from '../components/login/LoginForm'
import styles from './LoginPage.module.css'
import campusImage from '../assets/images/frgp-campus.webp'

function LoginPage() {
  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <section className={styles.imagePanel}>
          <img
            src={campusImage}
            alt="Edificio de la UTN Facultad Regional General Pacheco"
            className={styles.campusImage}
          />

          <div className={styles.imageOverlay} />

          <div className={styles.brand}>
            <span>UTN</span>
            <h2>Facultad Regional General Pacheco</h2>
            <p>Sistema Académico</p>
          </div>
        </section>

        <section className={styles.formPanel}>
          <LoginForm />
        </section>
      </div>
    </main>
  )
}

export default LoginPage
