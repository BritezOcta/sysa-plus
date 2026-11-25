import { teachersLabel } from "../../hooks/useCourseEnrollment";
import type { StudentEnrollment } from "../../types";
import styles from "./EnrollmentSection.module.css";

interface MyEnrollmentsSectionProps {
  enrollments: StudentEnrollment[];
  canCancel: boolean;
  disabled?: boolean;
  onCancelEnrollment: (item: StudentEnrollment) => void;
}

export default function MyEnrollmentsSection({
  enrollments,
  canCancel,
  disabled = false,
  onCancelEnrollment,
}: MyEnrollmentsSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Mis Materias Inscriptas</h2>

      {enrollments.length === 0 ? (
        <p className={styles.emptyMessage}>
          Aún no te has inscripto a ninguna materia en este período.
        </p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Materia</th>
                <th>Comisión</th>
                <th>Horario</th>
                <th>Docente a cargo</th>
                {canCancel && <th aria-label="Acciones" />}
              </tr>
            </thead>

            <tbody>
              {enrollments.map((item) => (
                <tr key={item.courseEnrollmentId}>
                  <td>{item.subjectName}</td>
                  <td>{item.commission}</td>
                  <td>{item.scheduleText}</td>
                  <td>{teachersLabel(item.teachers)}</td>
                  {canCancel && (
                    <td>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        disabled={disabled}
                        onClick={() => onCancelEnrollment(item)}
                      >
                        Cancelar inscripción
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
