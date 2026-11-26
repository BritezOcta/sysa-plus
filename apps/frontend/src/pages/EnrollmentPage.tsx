import { useAuthenticatedUser } from "../auth/AuthContext";
import AvailableSubjectsList from "../components/enrollment/SubjectList";
import { formatDni, getUserFullName } from "../helpers/UserDisplayHelper";
import EnrollmentErrorModal from "../components/enrollment/EnrollmentError";
import MyEnrollmentsSection from "../components/enrollment/EnrollmentSection";
import ToastViewport from "../components/ui/ToastViewport";
import { useCourseEnrollment } from "../hooks/useCourseEnrollment";
import type { EnrollmentPeriod } from "../types";
import styles from "./EnrollmentPage.module.css";

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function periodWindowText(period: EnrollmentPeriod): string {
  const range = `del ${formatDate(period.enrollmentStartDate)} al ${formatDate(period.enrollmentEndDate)}`;
  return period.isOpen ? `Inscripción abierta ${range}` : `Inscripción cerrada (habilitada ${range})`;
}

/** RF-04: inscripción a cursadas. Se muestra dentro del menú del alumno (/alumno/inscripcion-cursado). */
export default function EnrollmentPage() {
  const user = useAuthenticatedUser();
  const {
    overview,
    loadState,
    retryLoad,
    isSubmitting,
    modalState,
    dismissModal,
    toasts,
    dismissToast,
    handleRequestEnroll,
    handleRequestCancel,
  } = useCourseEnrollment();

  if (loadState.status === "loading" && !overview) {
    return (
      <main className={styles.mainContent}>
        <p className={styles.stateMessage}>Cargando materias disponibles...</p>
      </main>
    );
  }

  if (loadState.status === "error" && !overview) {
    return (
      <main className={styles.mainContent}>
        <div className={styles.stateBox}>
          <p>{loadState.message}</p>
          <button type="button" className={styles.retryButton} onClick={retryLoad}>
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  if (!overview) return null;

  const { period, student, subjects, enrollments } = overview;
  const isOpen = period?.isOpen ?? false;

  return (
    <div className={styles.pageLayout}>
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h1>Inscripción a Cursada</h1>
              <p className={styles.periodSubtitle}>
                {period
                  ? `Período Académico: ${period.semester}° Cuatrimestre ${period.year}`
                  : "Sin período de inscripción configurado"}
                {" • "}Plan: {student.careerName} ({student.studyPlan})
              </p>
              {period && (
                <p className={isOpen ? styles.windowOpen : styles.windowClosed}>
                  {periodWindowText(period)}
                </p>
              )}
            </div>

            <div className={styles.studentCard}>
              <span>
                <strong>Alumno:</strong> {getUserFullName(user)} (DNI:{" "}
                {formatDni(user.dni)})
              </span>
              <span>
                <strong>Condición:</strong>{" "}
                <span className={student.isActive ? styles.badgeActive : styles.badgeInactive}>
                  {student.isActive ? "ACTIVO" : "INACTIVO"}
                </span>
              </span>
            </div>
          </div>
        </header>

        {period && (
          <>
            <AvailableSubjectsList
              subjects={subjects}
              enrollments={enrollments}
              disabled={isSubmitting}
              onSelectCommission={handleRequestEnroll}
            />

            <MyEnrollmentsSection
              enrollments={enrollments}
              canCancel={isOpen}
              disabled={isSubmitting}
              onCancelEnrollment={handleRequestCancel}
            />
          </>
        )}
      </main>

      {modalState && (
        <EnrollmentErrorModal
          title={modalState.title}
          message={modalState.message}
          isConfirmation={modalState.isConfirmation}
          confirmLabel={modalState.confirmLabel}
          cancelLabel={modalState.cancelLabel}
          busy={isSubmitting}
          onClose={dismissModal}
          onConfirm={modalState.onConfirm}
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
