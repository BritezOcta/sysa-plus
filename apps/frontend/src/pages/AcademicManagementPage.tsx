import CurriculumCanvas from '../components/academic/canvas/CurriculumCanvas'
import ActiveCareerWorkspaceHeader from '../components/academic/careers/ActiveCareerWorkspaceHeader'
import CareerFormModal from '../components/academic/careers/CareerFormModal'
import CareersSection from '../components/academic/careers/CareersSection'
import {
  AuditDrawer,
  CircularConflictModal,
  ConfirmActionModal,
  NetworkErrorModal,
  StudentDeletionBlockModal,
} from '../components/academic/modals'
import SubjectFormModal from '../components/academic/subjects/SubjectFormModal'
import CurriculumTableView from '../components/academic/table/CurriculumTableView'
import TopNavbar from '../components/layout/TopNavbar'
import ToastViewport from '../components/ui/ToastViewport'
import { VIEW_MODES } from '../constants'
import { useAcademicManagement } from '../hooks'
import styles from './AcademicManagementPage.module.css'

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
    simulateServerFault,
    setSimulateServerFault,
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
    handleResetMockData,
  } = useAcademicManagement()

  return (
    <div className={styles.pageLayout}>
      <TopNavbar
        simulateServerFault={simulateServerFault}
        onToggleServerFault={setSimulateServerFault}
        onResetMockData={handleResetMockData}
        auditCount={auditLogs.length}
        unreadAuditCount={unreadAuditCount}
        onOpenAuditDrawer={openAuditDrawer}
      />

      <main className={styles.mainContent}>
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

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
