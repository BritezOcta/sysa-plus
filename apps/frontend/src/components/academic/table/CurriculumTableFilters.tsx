import { ENTITY_STATUS, FILTER_VALUES } from '../../../constants'
import type { StatusFilterValue, YearFilterValue } from '../../../types'
import styles from '../CurriculumTableView.module.css'

interface CurriculumTableFiltersProps {
  search: string
  yearFilter: YearFilterValue
  statusFilter: StatusFilterValue
  durationYears: number
  onSearchChange: (value: string) => void
  onYearFilterChange: (value: YearFilterValue) => void
  onStatusFilterChange: (value: StatusFilterValue) => void
}

export default function CurriculumTableFilters({
  search,
  yearFilter,
  statusFilter,
  durationYears,
  onSearchChange,
  onYearFilterChange,
  onStatusFilterChange,
}: CurriculumTableFiltersProps) {
  const careerYears = Array.from({ length: durationYears }, (_, i) => i + 1)

  return (
    <div className={styles.filtersBar}>
      <div className={styles.filterField}>
        <label htmlFor="table-search-input" className={styles.filterLabel}>
          Buscar por código o nombre
        </label>
        <input
          id="table-search-input"
          name="tableSearch"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Ej. ISI-103 o Análisis Matemático…"
          autoComplete="off"
          className={styles.searchInput}
        />
      </div>

      <div className={styles.filterGroup}>
        <div className={styles.filterField}>
          <label htmlFor="table-year-filter" className={styles.filterLabel}>
            Año del plan
          </label>
          <select
            id="table-year-filter"
            name="yearFilter"
            value={yearFilter}
            onChange={(e) => onYearFilterChange(e.target.value)}
            className={styles.filterSelect}
          >
            <option value={FILTER_VALUES.ALL}>Todos los años</option>
            {careerYears.map((yr) => (
              <option key={yr} value={String(yr)}>
                {yr}° Año
              </option>
            ))}
            <option value={FILTER_VALUES.BANK}>Sin asignar (Banco)</option>
          </select>
        </div>

        <div className={styles.filterField}>
          <label htmlFor="table-status-filter" className={styles.filterLabel}>
            Estado operativo
          </label>
          <select
            id="table-status-filter"
            name="statusFilter"
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange(e.target.value as StatusFilterValue)
            }
            className={styles.filterSelect}
          >
            <option value={FILTER_VALUES.ALL}>Todos los estados</option>
            <option value={ENTITY_STATUS.ACTIVE}>Solo activas</option>
            <option value={ENTITY_STATUS.INACTIVE}>Solo inactivas</option>
          </select>
        </div>
      </div>
    </div>
  )
}
