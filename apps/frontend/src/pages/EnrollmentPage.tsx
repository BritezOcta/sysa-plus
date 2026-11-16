import AvailableSubjectsList from "../components/enrollment/SubjectList";
import EnrollmentErrorModal from "../components/enrollment/EnrollmentError";
import MyEnrollmentsSection from "../components/enrollment/EnrollmentSection";
import TopNavbar from "../components/layout/TopNavbar";
import ToastViewport from "../components/ui/ToastViewport";
import { useCourseEnrollment } from "../hooks/useCourseEnrollment";
import styles from "./EnrollmentPage.module.css";

export default function EnrollmentPage() {
  const {
    subjects,
    commissions,
    myEnrollments,
    modalState,
    dismissModal,
    toasts,
    dismissToast,
    studentStatus,
    toggleStudentStatus,
    periodOpen,
    togglePeriodOpen,
    simulateServerError,
    setSimulateServerError,
    toggleServerError,
    handleRequestEnroll,
    handleRequestCancel,
  } = useCourseEnrollment();

  return (
    <div className={styles.pageLayout}>
      <TopNavbar
        simulateServerFault={simulateServerError}
        onToggleServerFault={setSimulateServerError}
        onResetMockData={() => {}}
        auditCount={0}
        unreadAuditCount={0}
        onOpenAuditDrawer={() => {}}
      />

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h1>Inscripción a Cursada</h1>
              <p className={styles.periodSubtitle}>
                Período Académico: 1° Cuatrimestre 2026 • Plan: Ingeniería en
                Sistemas (2023)
              </p>
            </div>

            <div className={styles.studentCard}>
              <span>
                <strong>Alumno:</strong> Juan Pérez (DNI: 40.123.456)
              </span>
              <span>
                <strong>Condición:</strong>{" "}
                <span
                  className={
                    studentStatus === "ACTIVO"
                      ? styles.badgeActive
                      : styles.badgeInactive
                  }
                >
                  {studentStatus}
                </span>
              </span>
            </div>
          </div>

          <div className={styles.toolbar}>
            <span className={styles.toolbarLabel}>Controles de prueba:</span>

            <button
              type="button"
              className={
                studentStatus === "ACTIVO"
                  ? styles.simButton
                  : styles.simButtonAlert
              }
              onClick={toggleStudentStatus}
            >
              Estado Alumno: {studentStatus}
            </button>

            <button
              type="button"
              className={periodOpen ? styles.simButton : styles.simButtonAlert}
              onClick={togglePeriodOpen}
            >
              Período: {periodOpen ? "Abierto" : "Cerrado"}
            </button>

            <button
              type="button"
              className={
                !simulateServerError ? styles.simButton : styles.simButtonAlert
              }
              onClick={toggleServerError}
            >
              Red: {simulateServerError ? "Simulando Caída" : "Conectado"}
            </button>
          </div>
        </header>

        <AvailableSubjectsList
          subjects={subjects}
          commissions={commissions}
          enrolledSubjectIds={myEnrollments.map((e) => e.id)}
          onSelectCommission={handleRequestEnroll}
        />

        <MyEnrollmentsSection
          enrollments={myEnrollments}
          onCancelEnrollment={handleRequestCancel}
        />
      </main>

      {modalState && (
        <EnrollmentErrorModal
          title={modalState.title}
          message={modalState.message}
          isConfirmation={modalState.isConfirmation}
          onClose={dismissModal}
          onConfirm={modalState.onConfirm}
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
