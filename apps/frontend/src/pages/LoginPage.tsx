import LoginBrandPanel from '../components/login/LoginBrandPanel'
import LoginForm from '../components/login/LoginForm'
import styles from './LoginPage.module.css'

function LoginPage() {
  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <LoginBrandPanel />

        <section className={styles.formPanel}>
          <LoginForm />
        </section>
      </div>
    </main>
  )
}

export default LoginPage
