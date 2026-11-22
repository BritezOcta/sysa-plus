import styles from "./EnrollmentSection.module.css";

export interface EnrollmentItem {
  id: number | string;
  subject: {
    name: string;
  };
  commission: {
    id: string;
    name: string;
    scheduleText: string;
    teacher: string;
  };
}

interface MyEnrollmentsSectionProps {
  enrollments: EnrollmentItem[];
  onCancelEnrollment: (item: EnrollmentItem) => void;
}

export default function MyEnrollmentsSection({
  enrollments,
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
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Materia</th>
              <th>Comisión</th>
              <th>Horario</th>
              <th>Docente a cargo</th>
            </tr>
          </thead>

          <tbody>
            {enrollments.map((item) => (
              <tr key={item.id}>
                <td>{item.subject.name}</td>
                <td>{item.commission.name}</td>
                <td>{item.commission.scheduleText}</td>
                <td>{item.commission.teacher}</td>
                <td>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => onCancelEnrollment(item)}
                  >
                    Cancelar inscripción
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
