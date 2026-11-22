import styles from "./SubjectList.module.css";

export interface SubjectOption {
  id: string;
  name: string;
  year: number;
  period: number;
}

export interface CommissionOption {
  id: string;
  subjectId: string;
  name: string;
  scheduleText: string;
  day: string;
  startHour: number;
  endHour: number;
  teacher: string;
  enrolledCount: number;
  quota: number;
}

interface AvailableSubjectsListProps {
  subjects: SubjectOption[];
  commissions: CommissionOption[];
  enrolledSubjectIds: (string | number)[];
  onSelectCommission: (
    subject: SubjectOption,
    commission: CommissionOption,
  ) => void;
}

export default function AvailableSubjectsList({
  subjects,
  commissions,
  enrolledSubjectIds,
  onSelectCommission,
}: AvailableSubjectsListProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Materias Disponibles para Cursar</h2>

      <div className={styles.grid}>
        {subjects.map((subject) => {
          const subjectCommissions = commissions.filter(
            (c) => c.subjectId === subject.id,
          );

          const isAlreadyEnrolled = enrolledSubjectIds.includes(subject.id);

          return (
            <div key={subject.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{subject.name}</h3>
                <p className={styles.cardMeta}>
                  {subject.year}° Año • {subject.period}° Cuatrimestre
                </p>
              </div>

              <div className={styles.commissionsList}>
                {subjectCommissions.map((comm) => (
                  <div key={comm.id} className={styles.commissionItem}>
                    <div className={styles.commissionInfo}>
                      <strong>Comisión {comm.name}</strong>
                      <span>{comm.scheduleText}</span>
                      <span>Docente: {comm.teacher}</span>
                      <span className={styles.quotaBadge}>
                        Cupo: {comm.enrolledCount} / {comm.quota}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.enrollBtn}
                      disabled={isAlreadyEnrolled}
                      onClick={() => onSelectCommission(subject, comm)}
                    >
                      {isAlreadyEnrolled ? "Inscripto" : "Inscribirse"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
