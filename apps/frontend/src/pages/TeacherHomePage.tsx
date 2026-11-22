import { Link, useNavigate } from "react-router";
import utnLogo from "../assets/images/utn-logotipo.svg";
import { useAuth, useAuthenticatedUser } from "../auth/AuthContext";
import { APP_ROUTES, INSTITUTION_BRAND, ROLE_LABELS } from "../constants";
import { getUserFullName } from "../helpers/UserDisplayHelper";
import styles from "./TeacherHomePage.module.css";

// Datos de prueba hasta conectar con el endpoint de comisiones del docente
const MOCK_COMMISSIONS = [
  {
    id: "c1",
    subject: "Análisis Matemático I",
    commission: "1K1",
    schedule: "Lunes y Miércoles 18:00 hs",
    studentsCount: 32,
  },
  {
    id: "c2",
    subject: "Algoritmos y Estructuras de Datos",
    commission: "1K2",
    schedule: "Martes y Jueves 19:30 hs",
    studentsCount: 28,
  },
];

export default function TeacherHomePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useAuthenticatedUser();

  async function handleLogout() {
    await logout();
    navigate(APP_ROUTES.LOGIN, { replace: true });
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <img
            src={utnLogo}
            alt={INSTITUTION_BRAND.LOGO_ALT}
            className={styles.logo}
          />
          <div>
            <h1 className={styles.title}>Panel Docente</h1>
            <p className={styles.subtitle}>
              {getUserFullName(user)} ·{" "}
              <span className={styles.role}>{ROLE_LABELS[user.role]}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.logoutButton}
          onClick={() => void handleLogout()}
        >
          Cerrar sesión
        </button>
      </header>

      <main className={styles.container}>
        {/* Accesos principales a los requerimientos docentes */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Gestión Académica</h2>
          <div className={styles.modulesGrid}>
            <Link
              to={APP_ROUTES.TEACHER_ATTENDANCE}
              className={styles.moduleCard}
            >
              <h3>Asistencias</h3>
              <p>
                Registrá presentes y ausentes por clase y consultá el porcentaje
                acumulado de regularidad por alumno.
              </p>
            </Link>

            <Link to={APP_ROUTES.TEACHER_GRADES} className={styles.moduleCard}>
              <h3>Notas y Aprobación</h3>
              <p>
                Cargá parciales, recuperatorios y finales para actualizar
                automáticamente la condición del alumno en la materia.
              </p>
            </Link>

            <Link
              to={APP_ROUTES.TEACHER_STUDENTS}
              className={styles.moduleCard}
            >
              <h3>Alumnos y Observaciones</h3>
              <p>
                Consultá los inscriptos por comisión y registrá observaciones
                privadas de seguimiento individual.
              </p>
            </Link>
          </div>
        </section>

        {/* Comisiones asignadas al docente */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mis Comisiones Activas</h2>
          <div className={styles.commissionsGrid}>
            {MOCK_COMMISSIONS.map((item) => (
              <article key={item.id} className={styles.commissionCard}>
                <div className={styles.commissionHeader}>
                  <h3>{item.subject}</h3>
                  <span className={styles.badge}>
                    Comisión {item.commission}
                  </span>
                </div>
                <p className={styles.meta}>{item.schedule}</p>
                <p className={styles.meta}>
                  {item.studentsCount} alumnos inscriptos
                </p>

                <div className={styles.cardActions}>
                  <Link
                    to={`${APP_ROUTES.TEACHER_ATTENDANCE}?comision=${item.id}`}
                    className={styles.actionBtn}
                  >
                    Asistencia
                  </Link>
                  <Link
                    to={`${APP_ROUTES.TEACHER_GRADES}?comision=${item.id}`}
                    className={styles.actionBtn}
                  >
                    Notas
                  </Link>
                  <Link
                    to={`${APP_ROUTES.TEACHER_STUDENTS}?comision=${item.id}`}
                    className={styles.actionBtn}
                  >
                    Alumnos
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
