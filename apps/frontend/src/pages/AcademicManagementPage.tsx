import CurriculumCanvas from "../components/academic/canvas/CurriculumCanvas";
import ActiveCareerWorkspaceHeader from "../components/academic/careers/ActiveCareerWorkspaceHeader";
import CareerFormModal from "../components/academic/careers/CareerFormModal";
import CareersSection from "../components/academic/careers/CareersSection";
import {
  AuditDrawer,
  CircularConflictModal,
  ConfirmActionModal,
  NetworkErrorModal,
  StudentDeletionBlockModal,
} from "../components/academic/modals";
import SubjectFormModal from "../components/academic/subjects/SubjectFormModal";
import CurriculumTableView from "../components/academic/table/CurriculumTableView";
import ToastViewport from "../components/ui/ToastViewport";
import { VIEW_MODES } from "../constants";
import { useAcademicManagement } from "../hooks";
import styles from "./AcademicManagementPage.module.css";
import { useState } from "react";
import BroadcastNoticeModal from "../components/academic/modals/BrodNoticeModal";

export default function AcademicManagementPage() {
  const {
    careers,
    subjects,
    correlativities,
    activeCareer,
    careerSubjects,
    careerCorrelativities,
    setSelectedCareerId,
    viewMode,
    setViewMode,
    simMode,
    toggleSimMode,
    careerModalState,
    openNewCareerModal,
    openEditCareerModal,
    closeCareerModal,
    subjectModalState,
    openCreateSubjectModal,
    openEditSubjectModal,
    closeSubjectModal,
    blockedDeletionSubject,
    dismissBlockedDeletionSubject,
    circularConflictNodes,
    dismissCircularConflictNodes,
    confirmDialog,
    dismissConfirmDialog,
    auditLogs,
    auditDrawerOpen,
    unreadAuditCount,
    openAuditDrawer,
    closeAuditDrawer,
    pendingFailedOperation,
    dismissFailedOperation,
    toasts,
    dismissToast,
    handleSaveCareer,
    handleToggleCareerStatus,
    handleDeleteCareer,
    handleSaveSubject,
    handleMoveSubjectSlot,
    handleToggleSubjectStatus,
    handleRequestDeleteSubject,
    handleInactivateBlockedSubject,
    handleConnectCorrelativity,
    handleCycleCorrelativityType,
    handleRemoveCorrelativity,
    handleReloadData,
  } = useAcademicManagement();

  const [noticeModalOpen, setNoticeModalOpen] = useState(false);

  return (
    <div className={styles.pageLayout}>
      <main className={styles.mainContent}>
        {/* Acciones de la página (antes estaban en la barra superior del administrador). */}
        <div
          className={styles.navControls}
          style={{ justifyContent: "flex-end", marginBottom: "1rem" }}
        >
          <button
            type="button"
            onClick={handleReloadData}
            className={styles.resetMockBtn}
          >
            Recargar datos
          </button>
          <button
            type="button"
            onClick={openAuditDrawer}
            className={styles.auditBtn}
          >
            Auditoría ({auditLogs.length})
            {unreadAuditCount > 0 && (
              <span className={styles.unreadDot}>+{unreadAuditCount}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setNoticeModalOpen(true)}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: 6,
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            + Nuevo aviso
          </button>
        </div>
        <CareersSection
          careers={careers}
          activeCareerId={activeCareer?.id}
          subjects={subjects}
          correlativities={correlativities}
          onSelectCareer={setSelectedCareerId}
          onCreateCareer={openNewCareerModal}
          onEditCareer={openEditCareerModal}
          onToggleCareerStatus={handleToggleCareerStatus}
          onDeleteCareer={handleDeleteCareer}
        />

        {activeCareer && (
          <section
            className={styles.workspaceSection}
            aria-labelledby="active-career-heading"
          >
            <ActiveCareerWorkspaceHeader
              activeCareer={activeCareer}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              onCreateSubject={() => openCreateSubjectModal()}
            />

            {viewMode === VIEW_MODES.CANVAS ? (
              <CurriculumCanvas
                career={activeCareer}
                subjects={careerSubjects}
                correlativities={careerCorrelativities}
                simMode={simMode}
                onToggleSimMode={toggleSimMode}
                onMoveSubjectSlot={handleMoveSubjectSlot}
                onConnectCorrelativity={handleConnectCorrelativity}
                onCycleCorrelativityType={handleCycleCorrelativityType}
                onRemoveCorrelativity={handleRemoveCorrelativity}
                onEditSubject={openEditSubjectModal}
                onDeleteSubject={handleRequestDeleteSubject}
                onToggleSubjectStatus={handleToggleSubjectStatus}
                onCreateSubjectInSlot={(year, period) =>
                  openCreateSubjectModal(year, period)
                }
              />
            ) : (
              <CurriculumTableView
                career={activeCareer}
                subjects={careerSubjects}
                correlativities={careerCorrelativities}
                onEditSubject={openEditSubjectModal}
                onDeleteSubject={handleRequestDeleteSubject}
                onToggleSubjectStatus={handleToggleSubjectStatus}
                onRemoveCorrelativity={handleRemoveCorrelativity}
                onCreateSubject={() => openCreateSubjectModal()}
              />
            )}
          </section>
        )}
      </main>

      {careerModalState.open && (
        <CareerFormModal
          careerToEdit={careerModalState.careerToEdit}
          existingCareers={careers}
          onClose={closeCareerModal}
          onSave={handleSaveCareer}
        />
      )}

      {subjectModalState.open && activeCareer && (
        <SubjectFormModal
          subjectToEdit={subjectModalState.subjectToEdit}
          defaultYear={subjectModalState.defaultYear}
          defaultPeriod={subjectModalState.defaultPeriod}
          activeCareer={activeCareer}
          careers={careers}
          allSubjects={subjects}
          correlativities={correlativities}
          onClose={closeSubjectModal}
          onSave={handleSaveSubject}
        />
      )}

      {blockedDeletionSubject && (
        <StudentDeletionBlockModal
          subject={blockedDeletionSubject}
          onClose={dismissBlockedDeletionSubject}
          onInactivateInstead={handleInactivateBlockedSubject}
        />
      )}

      {circularConflictNodes && (
        <CircularConflictModal
          cycleNodes={circularConflictNodes}
          onClose={dismissCircularConflictNodes}
        />
      )}

      {pendingFailedOperation && (
        <NetworkErrorModal
          actionDescription={pendingFailedOperation.description}
          onClose={dismissFailedOperation}
          onRetry={pendingFailedOperation.retryFn}
        />
      )}

      {confirmDialog && (
        <ConfirmActionModal
          title={confirmDialog.title}
          description={confirmDialog.description}
          impactDetail={confirmDialog.impactDetail}
          confirmLabel={confirmDialog.confirmLabel}
          tone={confirmDialog.tone}
          onClose={dismissConfirmDialog}
          onConfirm={confirmDialog.onConfirm}
        />
      )}

      {auditDrawerOpen && (
        <AuditDrawer logs={auditLogs} onClose={closeAuditDrawer} />
      )}
      {noticeModalOpen && (
        <BroadcastNoticeModal
          onClose={() => setNoticeModalOpen(false)}
          onSuccess={(sentCount) => {
            alert(`Aviso enviado a ${sentCount} alumno(s).`);
          }}
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
