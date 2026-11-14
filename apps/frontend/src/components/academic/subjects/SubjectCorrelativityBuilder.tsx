import { useState } from 'react'
import { CORRELATIVITY_TYPES } from '../../../constants'
import type {
  CorrelativityType,
  PendingRequirement,
  Subject,
} from '../../../types'
import styles from '../Modals.module.css'
import CandidateSubjectItem from './CandidateSubjectItem'
import CorrelativityDropBucket from './CorrelativityDropBucket'

interface SubjectCorrelativityBuilderProps {
  careerSubjects: Subject[]
  allSubjects: Subject[]
  requirements: PendingRequirement[]
  onAssignRequirement: (
    requiresSubjectId: string,
    type: CorrelativityType,
  ) => void
  onRemoveRequirement: (requiresSubjectId: string) => void
}

const DROP_BUCKETS_CONFIG = [
  {
    type: CORRELATIVITY_TYPES.REGULAR_TO_ENROLL,
    title: 'Regularizada para cursar',
    subtitle: 'Requisito de cursada regular previa',
    badgeClass: styles.bucketAmber,
  },
  {
    type: CORRELATIVITY_TYPES.APPROVED_TO_ENROLL,
    title: 'Aprobada para cursar',
    subtitle: 'Examen final aprobado antes de cursar',
    badgeClass: styles.bucketBlue,
  },
  {
    type: CORRELATIVITY_TYPES.APPROVED_FOR_EXAM,
    title: 'Aprobada para rendir final',
    subtitle: 'Examen final aprobado para rendir esta materia',
    badgeClass: styles.bucketGreen,
  },
] as const

export default function SubjectCorrelativityBuilder({
  careerSubjects,
  allSubjects,
  requirements,
  onAssignRequirement,
  onRemoveRequirement,
}: SubjectCorrelativityBuilderProps) {
  const [searchPrereq, setSearchPrereq] = useState('')
  const [draggedCandidateId, setDraggedCandidateId] = useState<string | null>(
    null,
  )
  const [activeDropZone, setActiveDropZone] =
    useState<CorrelativityType | null>(null)

  const filteredCandidates = careerSubjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchPrereq.toLowerCase()) ||
      s.code.toLowerCase().includes(searchPrereq.toLowerCase()),
  )

  function handleDragStartCandidate(subjectId: string, e: React.DragEvent) {
    setDraggedCandidateId(subjectId)
    e.dataTransfer.setData('text/plain', subjectId)
  }

  function handleDragEndCandidate() {
    setDraggedCandidateId(null)
    setActiveDropZone(null)
  }

  function handleDragOverBucket(type: CorrelativityType, e: React.DragEvent) {
    e.preventDefault()
    if (activeDropZone !== type) {
      setActiveDropZone(type)
    }
  }

  function handleDropInBucket(type: CorrelativityType, e: React.DragEvent) {
    e.preventDefault()
    setActiveDropZone(null)
    const droppedId =
      draggedCandidateId || e.dataTransfer.getData('text/plain')
    if (droppedId) {
      onAssignRequirement(droppedId, type)
    }
  }

  return (
    <div className={styles.columnSection}>
      <div className={styles.sectionHeaderRow}>
        <h3 className={styles.sectionTitle}>2. Correlatividades</h3>
        <span className={styles.dragPillHint}>
          Botones REG / APR / FIN o arrastrar
        </span>
      </div>

      <div className={styles.correlativityBuilder}>
        <div className={styles.candidatePool}>
          <label htmlFor="subj-prereq-search" className={styles.searchLabel}>
            Filtrar materias candidatas
          </label>
          <input
            id="subj-prereq-search"
            name="searchPrereq"
            type="search"
            value={searchPrereq}
            onChange={(e) => setSearchPrereq(e.target.value)}
            placeholder="Buscar por código o nombre…"
            autoComplete="off"
            className={styles.miniSearch}
          />

          <div className={styles.candidateList}>
            {careerSubjects.length === 0 ? (
              <div className={styles.emptyPoolState}>
                Esta carrera todavía no tiene otras materias cargadas para
                asociar como correlativas.
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className={styles.emptyPoolState}>
                No se encontraron materias para "{searchPrereq}".
                <div>
                  <button
                    type="button"
                    className={styles.clearSearchBtn}
                    onClick={() => setSearchPrereq('')}
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              </div>
            ) : (
              filteredCandidates.map((cand) => {
                const assigned = requirements.find(
                  (r) => r.requiresSubjectId === cand.id,
                )
                return (
                  <CandidateSubjectItem
                    key={cand.id}
                    candidate={cand}
                    assignedRequirement={assigned}
                    onAssignType={onAssignRequirement}
                    onDragStartCandidate={handleDragStartCandidate}
                    onDragEndCandidate={handleDragEndCandidate}
                  />
                )
              })
            )}
          </div>
        </div>

        <div className={styles.dropBucketsStack}>
          {DROP_BUCKETS_CONFIG.map((bucket) => {
            const bucketReqs = requirements.filter(
              (r) => r.type === bucket.type,
            )
            return (
              <CorrelativityDropBucket
                key={bucket.type}
                type={bucket.type}
                title={bucket.title}
                subtitle={bucket.subtitle}
                badgeClassName={bucket.badgeClass}
                bucketRequirements={bucketReqs}
                allSubjects={allSubjects}
                isOver={activeDropZone === bucket.type}
                onDragOverBucket={handleDragOverBucket}
                onDragLeaveBucket={() => setActiveDropZone(null)}
                onDropInBucket={handleDropInBucket}
                onDragStartChip={handleDragStartCandidate}
                onRemoveRequirement={onRemoveRequirement}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
