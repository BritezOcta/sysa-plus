import { useState } from 'react'
import { FILTER_VALUES } from '../../../constants'
import { AcademicFormatHelper } from '../../../helpers'
import type {
  Career,
  Correlativity,
  StatusFilterValue,
  Subject,
  YearFilterValue,
} from '../../../types'
import styles from '../CurriculumTableView.module.css'
import CurriculumTableFilters from './CurriculumTableFilters'
import CurriculumTableRow from './CurriculumTableRow'

interface CurriculumTableViewProps {
  career: Career
  subjects: Subject[]
  correlativities: Correlativity[]
  onEditSubject: (subject: Subject) => void
  onDeleteSubject: (subject: Subject) => void
  onToggleSubjectStatus: (subject: Subject) => void
  onRemoveCorrelativity: (correlativityId: string) => void
  onCreateSubject: () => void
}

export default function CurriculumTableView({
  career,
  subjects,
  correlativities,
  onEditSubject,
  onDeleteSubject,
  onToggleSubjectStatus,
  onRemoveCorrelativity,
  onCreateSubject,
}: CurriculumTableViewProps) {
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState<YearFilterValue>(
    FILTER_VALUES.ALL,
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(
    FILTER_VALUES.ALL,
  )

  const subjectMap = new Map(subjects.map((s) => [s.id, s]))

  const hasActiveFilters =
    Boolean(search.trim()) ||
    yearFilter !== FILTER_VALUES.ALL ||
    statusFilter !== FILTER_VALUES.ALL

  const sortedSubjects = [...subjects]
    .filter((s) => {
      if (yearFilter === FILTER_VALUES.BANK && s.year !== null) return false
      if (
        yearFilter !== FILTER_VALUES.ALL &&
        yearFilter !== FILTER_VALUES.BANK &&
        s.year !== Number(yearFilter)
      ) {
        return false
      }
      if (statusFilter !== FILTER_VALUES.ALL && s.status !== statusFilter) {
        return false
      }
      if (search.trim()) {
        const query = search.toLowerCase()
        return (
          s.code.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      const diff =
        AcademicFormatHelper.getPeriodOrderIndex(a.year, a.period) -
        AcademicFormatHelper.getPeriodOrderIndex(b.year, b.period)
      return diff !== 0 ? diff : a.code.localeCompare(b.code)
    })

  function resetFilters() {
    setSearch('')
    setYearFilter(FILTER_VALUES.ALL)
    setStatusFilter(FILTER_VALUES.ALL)
  }

  return (
    <section
      className={styles.tableContainer}
      aria-labelledby="curriculum-table-heading"
    >
      <div className={styles.tableHeaderBar}>
        <div>
          <h3 id="curriculum-table-heading">
            Plan de estudios y matriz de correlatividades — {career.name}
          </h3>
          <p className={styles.tableHeaderSub}>{career.studyPlan}</p>
        </div>

        <span className={styles.tableCountBadge}>
          {sortedSubjects.length} de {subjects.length} materias
        </span>
      </div>

      <CurriculumTableFilters
        search={search}
        yearFilter={yearFilter}
        statusFilter={statusFilter}
        durationYears={career.durationYears}
        onSearchChange={setSearch}
        onYearFilterChange={setYearFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Materia</th>
              <th scope="col">Ubicación en plan</th>
              <th scope="col">Carga horaria</th>
              <th scope="col">Correlativas requeridas (previas)</th>
              <th scope="col">Habilita (posteriores)</th>
              <th scope="col">Inscriptos</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedSubjects.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyRow}>
                  <div>
                    {subjects.length === 0
                      ? 'Esta carrera todavía no registra materias en el plan de estudios.'
                      : 'No se encontraron materias con los filtros actuales.'}
                  </div>
                  <div className={styles.emptyRowActions}>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className={styles.clearFilterBtn}
                        onClick={resetFilters}
                      >
                        Limpiar filtros
                      </button>
                    )}
                    {subjects.length === 0 && (
                      <button
                        type="button"
                        className={styles.clearFilterBtn}
                        onClick={onCreateSubject}
                      >
                        + Nueva materia
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedSubjects.map((subj) => {
                const reqs = correlativities.filter(
                  (c) => c.subjectId === subj.id,
                )
                const unlocks = correlativities.filter(
                  (c) => c.requiresSubjectId === subj.id,
                )

                return (
                  <CurriculumTableRow
                    key={subj.id}
                    subject={subj}
                    requirements={reqs}
                    unlocks={unlocks}
                    subjectMap={subjectMap}
                    onEditSubject={onEditSubject}
                    onToggleSubjectStatus={onToggleSubjectStatus}
                    onDeleteSubject={onDeleteSubject}
                    onRemoveCorrelativity={onRemoveCorrelativity}
                  />
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
