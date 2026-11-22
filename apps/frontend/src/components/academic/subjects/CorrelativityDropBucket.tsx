import type {
  CorrelativityType,
  PendingRequirement,
  Subject,
} from '../../../types'
import styles from '../Modals.module.css'

interface CorrelativityDropBucketProps {
  type: CorrelativityType
  title: string
  subtitle: string
  badgeClassName: string
  bucketRequirements: PendingRequirement[]
  allSubjects: Subject[]
  isOver: boolean
  onDragOverBucket: (type: CorrelativityType, e: React.DragEvent) => void
  onDragLeaveBucket: () => void
  onDropInBucket: (type: CorrelativityType, e: React.DragEvent) => void
  onDragStartChip: (subjectId: string, e: React.DragEvent) => void
  onRemoveRequirement: (requiresSubjectId: string) => void
}

export default function CorrelativityDropBucket({
  type,
  title,
  subtitle,
  badgeClassName,
  bucketRequirements,
  allSubjects,
  isOver,
  onDragOverBucket,
  onDragLeaveBucket,
  onDropInBucket,
  onDragStartChip,
  onRemoveRequirement,
}: CorrelativityDropBucketProps) {
  return (
    <div
      onDragOver={(e) => onDragOverBucket(type, e)}
      onDragLeave={onDragLeaveBucket}
      onDrop={(e) => onDropInBucket(type, e)}
      className={`${styles.dropBucket} ${badgeClassName} ${
        isOver ? styles.dropBucketActive : ''
      }`}
    >
      <div className={styles.dropBucketHeader}>
        <strong>{title}</strong>
        <span>{bucketRequirements.length} req.</span>
      </div>
      <p className={styles.dropBucketSub}>{subtitle}</p>

      {bucketRequirements.length === 0 ? (
        <div className={styles.emptyDropPlaceholder}>
          Sin materias asignadas en esta condición
        </div>
      ) : (
        <div className={styles.assignedChips}>
          {bucketRequirements.map((req) => {
            const subj = allSubjects.find(
              (s) => s.id === req.requiresSubjectId,
            )
            if (!subj) return null
            return (
              <span
                key={req.requiresSubjectId}
                draggable
                onDragStart={(e) => onDragStartChip(subj.id, e)}
                className={styles.assignedChip}
              >
                <strong>{subj.code}</strong> {subj.name}
                <button
                  type="button"
                  onClick={() => onRemoveRequirement(subj.id)}
                  aria-label={`Quitar correlatividad ${subj.code} — ${subj.name}`}
                >
                  ✕
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
