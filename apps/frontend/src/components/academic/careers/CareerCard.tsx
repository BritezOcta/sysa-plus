import { ENTITY_STATUS } from '../../../constants'
import styles from '../../../pages/AcademicManagementPage.module.css'
import type { Career } from '../../../types'
import StatusPill from '../../ui/StatusPill'
import TrashIcon from '../../ui/TrashIcon'

interface CareerCardProps {
  career: Career
  isSelected: boolean
  subjectsCount: number
  correlativitiesCount: number
  onSelect: (careerId: string) => void
  onEdit: (career: Career) => void
  onToggleStatus: (career: Career) => void
  onDelete: (career: Career) => void
}

export default function CareerCard({
  career,
  isSelected,
  subjectsCount,
  correlativitiesCount,
  onSelect,
  onEdit,
  onToggleStatus,
  onDelete,
}: CareerCardProps) {
  const isActive = career.status === ENTITY_STATUS.ACTIVE

  return (
    <article
      className={`${styles.careerCard} ${
        isSelected ? styles.careerCardSelected : ''
      } ${!isActive ? styles.careerCardInactive : ''}`}
    >
      <button
        type="button"
        className={styles.careerSelectBtn}
        onClick={() => onSelect(career.id)}
        aria-pressed={isSelected}
        aria-label={`Seleccionar carrera ${career.code} — ${career.name}`}
      >
        <div className={styles.careerCardTop}>
          <span className={styles.careerCodeBadge}>{career.code}</span>
          <StatusPill
            status={career.status}
            activeClassName={styles.statusPillActive}
            inactiveClassName={styles.statusPillInactive}
          />
        </div>

        <h2 className={styles.careerName}>{career.name}</h2>
        <p className={styles.careerPlanMeta}>
          {career.studyPlan} · <strong>{career.durationYears} años</strong>
        </p>
      </button>

      <div className={styles.careerCardFooter}>
        <div className={styles.careerCounters}>
          <span>{subjectsCount} materias</span>
          <span>·</span>
          <span>{correlativitiesCount} correlativas</span>
        </div>

        <div className={styles.careerQuickActions}>
          <button
            type="button"
            onClick={() => onEdit(career)}
            title="Editar datos de la carrera"
            aria-label={`Editar carrera ${career.code} — ${career.name}`}
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus(career)}
            title={isActive ? 'Inactivar carrera' : 'Activar carrera'}
            aria-label={
              isActive
                ? `Inactivar carrera ${career.code} — ${career.name}`
                : `Activar carrera ${career.code} — ${career.name}`
            }
          >
            {isActive ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(career)}
            title="Dar de baja carrera"
            aria-label={`Dar de baja carrera ${career.code} — ${career.name}`}
            className={styles.careerDeleteBtn}
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}
