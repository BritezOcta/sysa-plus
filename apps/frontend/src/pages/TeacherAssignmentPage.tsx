import { ConfirmActionModal, NetworkErrorModal } from '../components/academic/modals'
import tableStyles from '../components/academic/CurriculumTableView.module.css'
import AssignTeacherModal from '../components/teacherAssignment/AssignTeacherModal'
import SubjectCommissionsCard from '../components/teacherAssignment/SubjectCommissionsCard'
import TeacherLoadView from '../components/teacherAssignment/TeacherLoadView'
import assignmentStyles from '../components/teacherAssignment/TeacherAssignment.module.css'
import ToastViewport from '../components/ui/ToastViewport'
import { useTeacherAssignment } from '../hooks/useTeacherAssignment'
import styles from './AcademicManagementPage.module.css'

/** RF-03: el Administrador/Director asigna docentes a las comisiones de cada cuatrimestre. */
export default function TeacherAssignmentPage() {
  const ta = useTeacherAssignment()
  const career = ta.options.careers.find((c) => c.id === ta.careerId)
  const yearOptions = Array.from({ length: career?.durationYears ?? 0 }, (_, i) => i + 1)

  const sectionTitle = (title: string, count: number) => (
    <h4 className={assignmentStyles.periodTitle}>
      {title} <span className={assignmentStyles.periodCount}>{count}</span>
    </h4>
  )

  const renderSubjects = (list: typeof ta.groupedSubjects[number][1]['first']) =>
    list.map((subject) => (
      <SubjectCommissionsCard
        key={subject.id}
        subject={subject}
        isSaving={ta.isSaving}
        onAssign={ta.openAssignModal}
        onChangeRole={ta.handleChangeRole}
        onUnassign={ta.handleRequestUnassign}
      />
    ))

  return (
    <div className={styles.pageLayout}>

      <main className={styles.mainContent}>
        <section className={styles.careersSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h1>Asignación de docentes</h1>
              <p className={styles.sectionSubtitle}>
                Asigná titulares y ayudantes a las comisiones de cada cuatrimestre. El docente solo accede a las comisiones que tiene a cargo.
              </p>
            </div>
            <div className={styles.viewTabs} role="tablist" aria-label="Vista">
              <button
                type="button"
                role="tab"
                aria-selected={ta.view === 'commissions'}
                className={`${styles.viewTabBtn} ${ta.view === 'commissions' ? styles.viewTabActive : ''}`}
                onClick={() => ta.setView('commissions')}
              >
                Por comisión
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={ta.view === 'teachers'}
                className={`${styles.viewTabBtn} ${ta.view === 'teachers' ? styles.viewTabActive : ''}`}
                onClick={() => ta.setView('teachers')}
              >
                Por docente
              </button>
            </div>
          </div>
        </section>

        {ta.view === 'teachers' ? (
          <TeacherLoadView
            teachers={ta.options.teachers}
            selectedTeacherId={ta.selectedTeacherId}
            onSelectTeacher={ta.setSelectedTeacherId}
            load={ta.teacherLoad}
          />
        ) : (
          <section className={styles.workspaceSection}>
            <div className={tableStyles.filtersBar}>
              <label className={tableStyles.filterField}>
                <span className={tableStyles.filterLabel}>Carrera</span>
                <select
                  className={tableStyles.filterSelect}
                  value={ta.careerId}
                  onChange={(e) => {
                    ta.setCareerId(e.target.value)
                    ta.setFilters((f) => ({ ...f, year: 'all' }))
                  }}
                >
                  {ta.options.careers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}){c.isActive ? '' : ' · inactiva'}
                    </option>
                  ))}
                </select>
              </label>
              <label className={tableStyles.filterField}>
                <span className={tableStyles.filterLabel}>Período</span>
                <select className={tableStyles.filterSelect} value={ta.periodId} onChange={(e) => ta.setPeriodId(e.target.value)}>
                  {ta.options.periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}{p.isCurrent ? ' (actual)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className={tableStyles.filterField}>
                <span className={tableStyles.filterLabel}>Año</span>
                <select
                  className={tableStyles.filterSelect}
                  value={String(ta.filters.year)}
                  onChange={(e) =>
                    ta.setFilters((f) => ({ ...f, year: e.target.value === 'all' ? 'all' : Number(e.target.value) }))
                  }
                >
                  <option value="all">Todos</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}° año</option>
                  ))}
                </select>
              </label>
              <label className={tableStyles.filterField}>
                <span className={tableStyles.filterLabel}>Buscar</span>
                <input
                  type="search"
                  className={tableStyles.searchInput}
                  placeholder="Materia, comisión o docente"
                  value={ta.filters.search}
                  onChange={(e) => ta.setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </label>
              <label className={assignmentStyles.pendingToggle}>
                <input
                  type="checkbox"
                  checked={ta.filters.onlyPending}
                  onChange={(e) => ta.setFilters((f) => ({ ...f, onlyPending: e.target.checked }))}
                />
                Solo pendientes de titular
              </label>
            </div>

            {ta.data && (
              <div className={assignmentStyles.statsRow}>
                <span className={assignmentStyles.statChip}>{ta.stats.commissions} comisiones</span>
                <span className={`${assignmentStyles.statChip} ${ta.stats.withoutTitular ? assignmentStyles.statWarn : ''}`}>
                  {ta.stats.withoutTitular} sin titular
                </span>
                <span className={`${assignmentStyles.statChip} ${ta.stats.withoutTeacher ? assignmentStyles.statWarn : ''}`}>
                  {ta.stats.withoutTeacher} sin docente
                </span>
                <span className={assignmentStyles.statChip}>{ta.stats.subjectsWithoutCommission} materias sin comisión</span>
              </div>
            )}

            {ta.loadError && (
              <div className={assignmentStyles.errorBox} role="alert">{ta.loadError}</div>
            )}
            {ta.isLoading && <p className={assignmentStyles.emptyState}>Cargando comisiones…</p>}
            {!ta.isLoading && ta.options.careers.length === 0 && (
              <p className={assignmentStyles.emptyState}>No hay carreras cargadas. Primero dalas de alta en Oferta académica.</p>
            )}
            {!ta.isLoading && ta.options.careers.length > 0 && ta.options.periods.length === 0 && (
              <p className={assignmentStyles.emptyState}>No hay períodos académicos cargados.</p>
            )}
            {!ta.isLoading && ta.data && ta.groupedSubjects.length === 0 && (
              <p className={assignmentStyles.emptyState}>No hay materias que coincidan con los filtros.</p>
            )}

            {!ta.isLoading &&
              ta.groupedSubjects.map(([year, group]) => (
                <section key={year ?? 'none'} className={assignmentStyles.yearBlock}>
                  <h3 className={assignmentStyles.yearTitle}>{year ? `${year}° año` : 'Sin año asignado'}</h3>
                  <div className={assignmentStyles.semesterGrid}>
                    <div className={assignmentStyles.semesterColumn}>
                      {sectionTitle('1° cuatrimestre', group.first.length)}
                      {group.first.length ? renderSubjects(group.first) : <p className={assignmentStyles.columnEmpty}>—</p>}
                    </div>
                    <div className={assignmentStyles.semesterColumn}>
                      {sectionTitle('2° cuatrimestre', group.second.length)}
                      {group.second.length ? renderSubjects(group.second) : <p className={assignmentStyles.columnEmpty}>—</p>}
                    </div>
                  </div>
                  {group.annual.length > 0 && (
                    <div className={assignmentStyles.annualLane}>
                      {sectionTitle('Anuales', group.annual.length)}
                      <div className={assignmentStyles.annualGrid}>{renderSubjects(group.annual)}</div>
                    </div>
                  )}
                </section>
              ))}
          </section>
        )}
      </main>

      {ta.assignModal && (
        <AssignTeacherModal
          subject={ta.assignModal.subject}
          commission={ta.assignModal.commission}
          teachers={ta.options.teachers}
          isSaving={ta.isSaving}
          errorMessage={ta.modalError}
          onClose={ta.closeAssignModal}
          onAssign={ta.handleAssign}
        />
      )}

      {ta.confirmDialog && (
        <ConfirmActionModal
          title={ta.confirmDialog.title}
          description={ta.confirmDialog.description}
          {...(ta.confirmDialog.impactDetail ? { impactDetail: ta.confirmDialog.impactDetail } : {})}
          confirmLabel={ta.confirmDialog.confirmLabel}
          {...(ta.confirmDialog.tone ? { tone: ta.confirmDialog.tone } : {})}
          onClose={ta.dismissConfirmDialog}
          onConfirm={ta.confirmDialog.onConfirm}
        />
      )}

      {ta.pendingFailedOperation && (
        <NetworkErrorModal
          actionDescription={ta.pendingFailedOperation.description}
          onClose={ta.dismissFailedOperation}
          onRetry={ta.pendingFailedOperation.retryFn}
        />
      )}

      <ToastViewport toasts={ta.toasts} onDismiss={ta.dismissToast} />
    </div>
  )
}
