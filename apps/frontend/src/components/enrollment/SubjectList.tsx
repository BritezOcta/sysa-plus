import { teachersLabel } from "../../hooks/useCourseEnrollment";
import type { AvailableSubject, Commission, StudentEnrollment } from "../../types";
import styles from "./SubjectList.module.css";

interface AvailableSubjectsListProps {
  subjects: AvailableSubject[];
  enrollments: StudentEnrollment[];
  disabled?: boolean;
  onSelectCommission: (subject: AvailableSubject, commission: Commission) => void;
}

function subjectMeta(subject: AvailableSubject): string {
  const parts = [subject.subjectCode];
  if (subject.year) parts.push(`${subject.year}° Año`);
  if (subject.semester) parts.push(`${subject.semester}° Cuatrimestre`);
  return parts.join(" • ");
}

export default function AvailableSubjectsList({
  subjects,
  enrollments,
  disabled = false,
  onSelectCommission,
}: AvailableSubjectsListProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Materias Disponibles para Cursar</h2>

      {subjects.length === 0 ? (
        <p className={styles.emptyMessage}>
          No hay materias con comisiones abiertas para tu plan de estudios en este período.
        </p>
      ) : (
        <div className={styles.grid}>
          {subjects.map((subject) => {
            const enrollment = enrollments.find(
              (e) => e.studyPlanSubjectId === subject.studyPlanSubjectId,
            );

            return (
              <div key={subject.studyPlanSubjectId} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3>{subject.subjectName}</h3>
                  <p className={styles.cardMeta}>{subjectMeta(subject)}</p>
                  {subject.missingRequirements.length > 0 && (
                    <p className={styles.requirementsWarning}>
                      Correlativas pendientes:{" "}
                      {subject.missingRequirements
                        .map(
                          (m) =>
                            `${m.subjectName} (${m.requiredCondition === "APROBADA" ? "aprobada" : "regularizada"})`,
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>

                <div className={styles.commissionsList}>
                  {subject.commissions.map((comm) => {
                    const isThisCommission = enrollment?.courseOfferingId === comm.courseOfferingId;
                    const isFull = comm.enrolledCount >= comm.capacity;

                    let label = "Inscribirse";
                    if (isThisCommission) label = "Inscripto";
                    else if (enrollment) label = `Inscripto en ${enrollment.commission}`;

                    return (
                      <div key={comm.courseOfferingId} className={styles.commissionItem}>
                        <div className={styles.commissionInfo}>
                          <strong>Comisión {comm.name}</strong>
                          <span>{comm.scheduleText}</span>
                          <span>Docente: {teachersLabel(comm.teachers)}</span>
                          <span className={isFull ? styles.quotaBadgeFull : styles.quotaBadge}>
                            Cupo: {comm.enrolledCount} / {comm.capacity}
                            {isFull && " (sin vacantes)"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.enrollBtn}
                          disabled={disabled || Boolean(enrollment)}
                          onClick={() => onSelectCommission(subject, comm)}
                        >
                          {label}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
