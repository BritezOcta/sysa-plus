import { useRef, useState } from 'react'
import { ENTITY_STATUS, SUBJECT_RULES } from '../../../constants'
import {
  AcademicValidationHelper,
  CorrelativityGraphHelper,
} from '../../../helpers'
import type {
  Career,
  Correlativity,
  CorrelativityType,
  EntityStatus,
  PendingRequirement,
  Subject,
  SubjectFormPayload,
  SubjectPeriod,
} from '../../../types'
import ErrorBanner from '../../ui/ErrorBanner'
import ModalShell from '../../ui/ModalShell'
import UnsavedChangesBanner from '../../ui/UnsavedChangesBanner'
import styles from '../Modals.module.css'
import SubjectCorrelativityBuilder from './SubjectCorrelativityBuilder'
import SubjectMetadataFields from './SubjectMetadataFields'

interface SubjectFormModalProps {
  subjectToEdit: Subject | null
  defaultYear?: number | null
  defaultPeriod?: SubjectPeriod | null
  activeCareer: Career
  careers: Career[]
  allSubjects: Subject[]
  correlativities: Correlativity[]
  onClose: () => void
  onSave: (
    subjectData: SubjectFormPayload,
    updatedRequirements: PendingRequirement[],
  ) => void
}

export default function SubjectFormModal({
  subjectToEdit,
  defaultYear = SUBJECT_RULES.DEFAULT_YEAR,
  defaultPeriod = SUBJECT_RULES.DEFAULT_PERIOD,
  activeCareer,
  careers,
  allSubjects,
  correlativities,
  onClose,
  onSave,
}: SubjectFormModalProps) {
  const initialCareerId = subjectToEdit?.careerId ?? activeCareer.id
  const initialCode = subjectToEdit?.code ?? ''
  const initialName = subjectToEdit?.name ?? ''
  const initialWeekly =
    subjectToEdit?.weeklyHours ?? SUBJECT_RULES.DEFAULT_WEEKLY_HOURS
  const initialTotal =
    subjectToEdit?.totalHours ?? SUBJECT_RULES.DEFAULT_TOTAL_HOURS
  const initialUnassigned = subjectToEdit
    ? subjectToEdit.year === null
    : defaultYear === null
  const initialYear =
    subjectToEdit?.year ?? defaultYear ?? SUBJECT_RULES.DEFAULT_YEAR
  const initialPeriod: SubjectPeriod =
    subjectToEdit?.period ?? defaultPeriod ?? SUBJECT_RULES.DEFAULT_PERIOD
  const initialStatus: EntityStatus =
    subjectToEdit?.status ?? ENTITY_STATUS.ACTIVE
  const initialEnrolled =
    subjectToEdit?.enrolledStudents ?? SUBJECT_RULES.DEFAULT_ENROLLED_STUDENTS

  const [careerId, setCareerId] = useState(initialCareerId)
  const selectedCareer =
    careers.find((c) => c.id === careerId) ?? activeCareer

  const [code, setCode] = useState(initialCode)
  const [name, setName] = useState(initialName)
  const [weeklyHours, setWeeklyHours] = useState(initialWeekly)
  const [totalHours, setTotalHours] = useState(initialTotal)
  const [isUnassigned, setIsUnassigned] = useState<boolean>(initialUnassigned)
  const [year, setYear] = useState<number>(initialYear)
  const [period, setPeriod] = useState<SubjectPeriod>(initialPeriod)
  const [status, setStatus] = useState<EntityStatus>(initialStatus)
  const [enrolledStudents, setEnrolledStudents] =
    useState<number>(initialEnrolled)
  const [touched, setTouched] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [cycleErrorMessage, setCycleErrorMessage] = useState<string | null>(
    null,
  )

  const initialReqs: PendingRequirement[] = subjectToEdit
    ? correlativities
        .filter((c) => c.subjectId === subjectToEdit.id)
        .map((c) => ({
          requiresSubjectId: c.requiresSubjectId,
          type: c.type,
        }))
    : []

  const [requirements, setRequirements] =
    useState<PendingRequirement[]>(initialReqs)

  const codeInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const weeklyInputRef = useRef<HTMLInputElement>(null)
  const totalInputRef = useRef<HTMLInputElement>(null)
  const yearSelectRef = useRef<HTMLSelectElement>(null)

  const isDirty =
    careerId !== initialCareerId ||
    code !== initialCode ||
    name !== initialName ||
    weeklyHours !== initialWeekly ||
    totalHours !== initialTotal ||
    isUnassigned !== initialUnassigned ||
    year !== initialYear ||
    period !== initialPeriod ||
    status !== initialStatus ||
    enrolledStudents !== initialEnrolled ||
    !CorrelativityGraphHelper.areRequirementsEqual(requirements, initialReqs)

  const validation = AcademicValidationHelper.validateSubjectForm(
    {
      careerId,
      code,
      name,
      weeklyHours,
      totalHours,
      isUnassigned,
      year,
      period,
      status,
      enrolledStudents,
    },
    selectedCareer,
    allSubjects,
    subjectToEdit?.id,
    touched,
  )

  const careerSubjects = allSubjects.filter(
    (s) => s.careerId === careerId && s.id !== subjectToEdit?.id,
  )

  function handleRequestClose() {
    if (confirmDiscard) {
      setConfirmDiscard(false)
      return
    }
    if (isDirty) {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }

  function handleCareerChange(nextCareerId: string) {
    setCareerId(nextCareerId)
    setRequirements([])
    setCycleErrorMessage(null)
  }

  function handleWeeklyHoursChange(val: number) {
    setWeeklyHours(val)
    setTotalHours(
      AcademicValidationHelper.calculateSuggestedTotalHours(val, period),
    )
  }

  function tryAddOrMoveRequirement(
    requiresSubjectId: string,
    targetType: CorrelativityType,
  ) {
    setCycleErrorMessage(null)

    if (subjectToEdit) {
      const simulatedCorrs =
        CorrelativityGraphHelper.buildSimulatedCorrelativitiesForDraft(
          correlativities,
          subjectToEdit.id,
          careerId,
          requirements,
          requiresSubjectId,
        )

      const cycleCheck = CorrelativityGraphHelper.detectCircularDependency(
        simulatedCorrs,
        subjectToEdit.id,
        requiresSubjectId,
      )

      if (cycleCheck.hasCycle) {
        const formattedChain = CorrelativityGraphHelper.formatCycleChainText(
          cycleCheck.cyclePath,
          allSubjects,
        )
        setCycleErrorMessage(
          `Correlatividad circular detectada: no se puede exigir esta materia porque genera un bucle (${formattedChain}).`,
        )
        return
      }
    }

    setRequirements((prev) => {
      const withoutTarget = prev.filter(
        (r) => r.requiresSubjectId !== requiresSubjectId,
      )
      return [...withoutTarget, { requiresSubjectId, type: targetType }]
    })
  }

  function removeRequirement(requiresSubjectId: string) {
    setCycleErrorMessage(null)
    setRequirements((prev) =>
      prev.filter((r) => r.requiresSubjectId !== requiresSubjectId),
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setTouched(true)

    if (validation.duplicateSubjectName || validation.codeMissing) {
      codeInputRef.current?.focus()
      return
    }
    if (validation.nameMissing) {
      nameInputRef.current?.focus()
      return
    }
    if (validation.weeklyInvalid) {
      weeklyInputRef.current?.focus()
      return
    }
    if (validation.totalInvalid) {
      totalInputRef.current?.focus()
      return
    }
    if (validation.invalidYearForCareer) {
      yearSelectRef.current?.focus()
      return
    }

    onSave(
      {
        id: subjectToEdit?.id,
        careerId,
        code: validation.normalizedCode,
        name: name.trim(),
        weeklyHours: Number(weeklyHours),
        totalHours: Number(totalHours),
        year: isUnassigned ? null : Number(year),
        period: isUnassigned ? null : period,
        status,
        enrolledStudents: Math.max(
          SUBJECT_RULES.MIN_ENROLLED_STUDENTS,
          Number(enrolledStudents),
        ),
      },
      requirements,
    )
  }

  return (
    <ModalShell
      titleId="subject-modal-title"
      title={
        subjectToEdit
          ? `Editar materia: ${subjectToEdit.code} — ${subjectToEdit.name}`
          : 'Nueva materia y correlatividades'
      }
      subtitle={`Carrera: ${selectedCareer.code} — ${selectedCareer.name}`}
      closeAriaLabel="Cerrar formulario de materia"
      wide
      initialFocusRef={codeInputRef}
      onRequestClose={handleRequestClose}
    >
      <form onSubmit={handleSubmit} className={styles.formBody} noValidate>
        {confirmDiscard && (
          <UnsavedChangesBanner
            message="Tenés cambios sin guardar en la materia o sus correlatividades. ¿Querés descartarlos?"
            onKeepEditing={() => setConfirmDiscard(false)}
            onDiscard={onClose}
          />
        )}

        {touched && validation.missingFields.length > 0 && (
          <ErrorBanner title="Campos obligatorios incompletos">
            Completá {validation.missingFields.join(', ')} antes de guardar.
          </ErrorBanner>
        )}

        {validation.duplicateSubjectName && (
          <ErrorBanner title="Código de materia duplicado">
            El código <code>{validation.normalizedCode}</code> ya existe en{' '}
            <em>"{validation.duplicateSubjectName}"</em>. Ingresá un código
            único.
          </ErrorBanner>
        )}

        {validation.invalidYearForCareer && (
          <ErrorBanner title="Año fuera del plan de estudios">
            La carrera {selectedCareer.name} tiene una duración de{' '}
            {selectedCareer.durationYears} años.
          </ErrorBanner>
        )}

        {cycleErrorMessage && (
          <ErrorBanner title="Conflicto de referencia circular">
            {cycleErrorMessage}
          </ErrorBanner>
        )}

        <div className={styles.splitColumns}>
          <SubjectMetadataFields
            code={code}
            careerId={careerId}
            name={name}
            weeklyHours={weeklyHours}
            totalHours={totalHours}
            isUnassigned={isUnassigned}
            year={year}
            period={period}
            enrolledStudents={enrolledStudents}
            status={status}
            careers={careers}
            selectedCareer={selectedCareer}
            validation={validation}
            codeInputRef={codeInputRef}
            nameInputRef={nameInputRef}
            weeklyInputRef={weeklyInputRef}
            totalInputRef={totalInputRef}
            yearSelectRef={yearSelectRef}
            onCodeChange={setCode}
            onCareerChange={handleCareerChange}
            onNameChange={setName}
            onWeeklyHoursChange={handleWeeklyHoursChange}
            onTotalHoursChange={setTotalHours}
            onUnassignedChange={setIsUnassigned}
            onYearChange={setYear}
            onPeriodChange={setPeriod}
            onEnrolledStudentsChange={setEnrolledStudents}
            onStatusChange={setStatus}
          />

          <SubjectCorrelativityBuilder
            careerSubjects={careerSubjects}
            allSubjects={allSubjects}
            requirements={requirements}
            onAssignRequirement={tryAddOrMoveRequirement}
            onRemoveRequirement={removeRequirement}
          />
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleRequestClose}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.primaryBtn}>
            {subjectToEdit ? 'Guardar cambios' : 'Dar de alta materia'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
