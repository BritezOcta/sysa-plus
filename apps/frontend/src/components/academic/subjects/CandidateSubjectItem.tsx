import { CORRELATIVITY_TYPES } from '../../../constants'
import { AcademicFormatHelper } from '../../../helpers'
import type {
  CorrelativityType,
  PendingRequirement,
  Subject,
} from '../../../types'
import styles from '../Modals.module.css'

interface CandidateSubjectItemProps {
  candidate: Subject
  assignedRequirement: PendingRequirement | undefined
  onAssignType: (requiresSubjectId: string, type: CorrelativityType) => void
  onDragStartCandidate: (subjectId: string, e: React.DragEvent) => void
  onDragEndCandidate: () => void
}

export default function CandidateSubjectItem({
  candidate,
  assignedRequirement,
  onAssignType,
  onDragStartCandidate,
  onDragEndCandidate,
}: CandidateSubjectItemProps) {
  const isReg =
    assignedRequirement?.type === CORRELATIVITY_TYPES.REGULAR_TO_ENROLL
  const isApr =
    assignedRequirement?.type === CORRELATIVITY_TYPES.APPROVED_TO_ENROLL
  const isFin =
    assignedRequirement?.type === CORRELATIVITY_TYPES.APPROVED_FOR_EXAM

  return (
    <div
      draggable
      onDragStart={(e) => onDragStartCandidate(candidate.id, e)}
      onDragEnd={onDragEndCandidate}
      className={`${styles.candidateItem} ${
        assignedRequirement ? styles.candidateAssigned : ''
      }`}
    >
      <div className={styles.candidateInfo}>
        <span className={styles.candidateCode}>{candidate.code}</span>
        <span className={styles.candidateName}>{candidate.name}</span>
        <small className={styles.candidateSlot}>
          {AcademicFormatHelper.formatPeriodLabel(
            candidate.year,
            candidate.period,
          )}
        </small>
      </div>

      <div
        className={styles.quickAssignBtns}
        role="group"
        aria-label={`Asignar correlatividad para ${candidate.code} ${candidate.name}`}
      >
        <button
          type="button"
          title="Exigir Regularizada para Cursar"
          aria-label={`Exigir ${candidate.code} ${candidate.name} regularizada para cursar`}
          aria-pressed={isReg}
          className={`${styles.tinyActionBtn} ${
            isReg ? styles.tinyAmberActive : ''
          }`}
          onClick={() =>
            onAssignType(
              candidate.id,
              CORRELATIVITY_TYPES.REGULAR_TO_ENROLL,
            )
          }
        >
          REG
        </button>
        <button
          type="button"
          title="Exigir Aprobada para Cursar"
          aria-label={`Exigir ${candidate.code} ${candidate.name} aprobada para cursar`}
          aria-pressed={isApr}
          className={`${styles.tinyActionBtn} ${
            isApr ? styles.tinyBlueActive : ''
          }`}
          onClick={() =>
            onAssignType(
              candidate.id,
              CORRELATIVITY_TYPES.APPROVED_TO_ENROLL,
            )
          }
        >
          APR
        </button>
        <button
          type="button"
          title="Exigir Aprobada para Rendir Final"
          aria-label={`Exigir ${candidate.code} ${candidate.name} aprobada para rendir final`}
          aria-pressed={isFin}
          className={`${styles.tinyActionBtn} ${
            isFin ? styles.tinyGreenActive : ''
          }`}
          onClick={() =>
            onAssignType(
              candidate.id,
              CORRELATIVITY_TYPES.APPROVED_FOR_EXAM,
            )
          }
        >
          FIN
        </button>
      </div>
    </div>
  )
}
