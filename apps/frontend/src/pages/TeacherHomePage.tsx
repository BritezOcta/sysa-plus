import { useEffect, useState } from "react";
import { Link } from "react-router";
import { teacherApi, type TeacherCommissionSummary } from "../api/teacher.api";
import { APP_ROUTES } from "../constants";
import { useAuth } from "../auth/AuthContext";
import styles from "./TeacherHomePage.module.css";

export default function TeacherHomePage() {
  const { user, logout } = useAuth();
  const [commissions, setCommissions] = useState<TeacherCommissionSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommissions() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await teacherApi.getCommissions();
        setCommissions(list);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las comisiones.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCommissions();
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div>
            <h1 className={styles.title}>Panel Docente</h1>
            <p className={styles.subtitle}>
              Bienvenido/a,{" "}
              {user ? `${user.firstName} ${user.lastName}` : "Docente"}{" "}
              <span className={styles.role}>· Profesor</span>
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Link to={APP_ROUTES.CHANGE_PASSWORD} className={styles.logoutButton}>
            Cambiar contraseña
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className={styles.logoutButton}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className={styles.container}>
        <section>
          <h2 className={styles.sectionTitle}>Accesos rápidos</h2>
          <div className={styles.modulesGrid}>
            <Link
              to={APP_ROUTES.TEACHER_ATTENDANCE}
              className={styles.moduleCard}
            >
              <h3>Asistencias</h3>
              <p>
                Registrar y consultar la asistencia diaria de tus comisiones.
              </p>
            </Link>

            <Link to={APP_ROUTES.TEACHER_GRADES} className={styles.moduleCard}>
              <h3>Notas y Actas</h3>
              <p>
                Cargar calificaciones de parciales, recuperatorios y cerrar
                actas.
              </p>
            </Link>

            <Link
              to={APP_ROUTES.TEACHER_STUDENTS}
              className={styles.moduleCard}
            >
              <h3>Alumnos y Observaciones</h3>
              <p>
                Consultar el listado de inscriptos y cargar observaciones
                privadas.
              </p>
            </Link>
          </div>
        </section>

        <section>
          <h2 className={styles.sectionTitle}>Mis comisiones asignadas</h2>

          {error && <p className={styles.meta}>{error}</p>}

          {isLoading ? (
            <p className={styles.meta}>Cargando comisiones...</p>
          ) : commissions.length === 0 ? (
            <p className={styles.meta}>
              No tenés comisiones asignadas en este período.
            </p>
          ) : (
            <div className={styles.commissionsGrid}>
              {commissions.map((c) => (
                <article key={c.id} className={styles.commissionCard}>
                  <div className={styles.commissionHeader}>
                    <h3>{c.subjectName}</h3>
                    <span className={styles.badge}>
                      {c.subjectCode} · {c.commissionCode}
                    </span>
                  </div>

                  <p className={styles.meta}>
                    Inscriptos: <strong>{c.enrolledCount}</strong>
                  </p>
                  <p className={styles.meta}>
                    Período: {c.periodStart} al {c.periodEnd}
                  </p>

                  <div className={styles.cardActions}>
                    <Link
                      to={`${APP_ROUTES.TEACHER_ATTENDANCE}?comision=${c.id}`}
                      className={styles.actionBtn}
                    >
                      Asistencias
                    </Link>
                    <Link
                      to={`${APP_ROUTES.TEACHER_GRADES}?comision=${c.id}`}
                      className={styles.actionBtn}
                    >
                      Notas
                    </Link>
                    <Link
                      to={`${APP_ROUTES.TEACHER_STUDENTS}?comision=${c.id}`}
                      className={styles.actionBtn}
                    >
                      Alumnos
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
