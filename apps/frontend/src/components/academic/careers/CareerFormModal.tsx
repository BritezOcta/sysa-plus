import { useRef, useState } from 'react'
import { CAREER_RULES, ENTITY_STATUS } from '../../../constants'
import { AcademicValidationHelper } from '../../../helpers'
import type {
  Career,
  CareerFormPayload,
  EntityStatus,
} from '../../../types'
import ErrorBanner from '../../ui/ErrorBanner'
import FormField from '../../ui/FormField'
import ModalShell from '../../ui/ModalShell'
import UnsavedChangesBanner from '../../ui/UnsavedChangesBanner'
import styles from '../Modals.module.css'

interface CareerFormModalProps {
  careerToEdit: Career | null
  existingCareers: Career[]
  onClose: () => void
  onSave: (data: CareerFormPayload) => void
}

export default function CareerFormModal({
  careerToEdit,
  existingCareers,
  onClose,
  onSave,
}: CareerFormModalProps) {
  const initialCode = careerToEdit?.code ?? ''
  const initialName = careerToEdit?.name ?? ''
  const initialPlan =
    careerToEdit?.studyPlan ?? CAREER_RULES.DEFAULT_STUDY_PLAN
  const initialDuration =
    careerToEdit?.durationYears ?? CAREER_RULES.DEFAULT_DURATION_YEARS
  const initialStatus: EntityStatus =
    careerToEdit?.status ?? ENTITY_STATUS.ACTIVE
  const initialDescription = careerToEdit?.description ?? ''

  const [code, setCode] = useState(initialCode)
  const [name, setName] = useState(initialName)
  const [studyPlan, setStudyPlan] = useState(initialPlan)
  const [durationYears, setDurationYears] = useState(initialDuration)
  const [status, setStatus] = useState<EntityStatus>(initialStatus)
  const [description, setDescription] = useState(initialDescription)
  const [touched, setTouched] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const codeInputRef = useRef<HTMLInputElement>(null)
  const planInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const durationSelectRef = useRef<HTMLSelectElement>(null)

  const isDirty =
    code !== initialCode ||
    name !== initialName ||
    studyPlan !== initialPlan ||
    durationYears !== initialDuration ||
    status !== initialStatus ||
    description !== initialDescription

  const validation = AcademicValidationHelper.validateCareerForm(
    { code, name, studyPlan, durationYears, status, description },
    existingCareers,
    careerToEdit?.id,
    touched,
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setTouched(true)

    if (validation.duplicateCareer || validation.codeMissing) {
      codeInputRef.current?.focus()
      return
    }
    if (validation.planMissing) {
      planInputRef.current?.focus()
      return
    }
    if (validation.nameMissing) {
      nameInputRef.current?.focus()
      return
    }
    if (validation.durationInvalid) {
      durationSelectRef.current?.focus()
      return
    }

    onSave({
      id: careerToEdit?.id,
      code: validation.normalizedCode,
      name: name.trim(),
      studyPlan: studyPlan.trim(),
      durationYears: Number(durationYears),
      status,
      description: description.trim() || CAREER_RULES.DEFAULT_DESCRIPTION,
    })
  }

  const codeDescribedBy = [
    'career-code-hint',
    validation.codeError ? 'career-code-error' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ModalShell
      titleId="career-modal-title"
      title={
        careerToEdit
          ? `Editar carrera: ${careerToEdit.name}`
          : 'Nueva carrera universitaria'
      }
      subtitle={
        careerToEdit
          ? 'Actualizá los datos curriculares o el estado operativo de la carrera.'
          : 'Registrá una nueva carrera en la oferta académica de la UTN FRGP.'
      }
      closeAriaLabel="Cerrar formulario de carrera"
      initialFocusRef={codeInputRef}
      onRequestClose={handleRequestClose}
    >
      <form onSubmit={handleSubmit} className={styles.formBody} noValidate>
        {confirmDiscard && (
          <UnsavedChangesBanner
            onKeepEditing={() => setConfirmDiscard(false)}
            onDiscard={onClose}
          />
        )}

        {touched && validation.missingFields.length > 0 && (
          <ErrorBanner title="Campos obligatorios incompletos">
            Revisá {validation.missingFields.join(', ')}.
          </ErrorBanner>
        )}

        {validation.duplicateCareer && (
          <ErrorBanner title="Código de carrera duplicado">
            El código <code>{validation.normalizedCode}</code> ya pertenece a{' '}
            <em>"{validation.duplicateCareer.name}"</em>. Ingresá uno nuevo.
          </ErrorBanner>
        )}

        <div className={styles.grid2}>
          <FormField
            htmlFor="career-code"
            label="Código único"
            required
            error={validation.codeError}
            errorId="career-code-error"
            hint="Identificador único en el plan académico UTN."
            hintId="career-code-hint"
          >
            <input
              ref={codeInputRef}
              id="career-code"
              name="careerCode"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej. ISI-2026…"
              autoComplete="off"
              spellCheck={false}
              aria-required="true"
              aria-invalid={Boolean(validation.codeError)}
              aria-describedby={codeDescribedBy}
              className={validation.codeError ? styles.inputError : ''}
            />
          </FormField>

          <FormField
            htmlFor="career-plan"
            label="Plan de estudios"
            required
            error={validation.planError}
            errorId="career-plan-error"
          >
            <input
              ref={planInputRef}
              id="career-plan"
              name="studyPlan"
              type="text"
              value={studyPlan}
              onChange={(e) => setStudyPlan(e.target.value)}
              placeholder="Ej. Plan 2023 (Ord. 1877)…"
              autoComplete="off"
              aria-required="true"
              aria-invalid={Boolean(validation.planError)}
              aria-describedby={
                validation.planError ? 'career-plan-error' : undefined
              }
              className={validation.planError ? styles.inputError : ''}
            />
          </FormField>
        </div>

        <FormField
          htmlFor="career-name"
          label="Nombre de la carrera"
          required
          error={validation.nameError}
          errorId="career-name-error"
        >
          <input
            ref={nameInputRef}
            id="career-name"
            name="careerName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Ingeniería en Sistemas de Información…"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(validation.nameError)}
            aria-describedby={
              validation.nameError ? 'career-name-error' : undefined
            }
            className={validation.nameError ? styles.inputError : ''}
          />
        </FormField>

        <div className={styles.grid2}>
          <FormField
            htmlFor="career-duration"
            label="Duración (años del plan)"
            required
            error={validation.durationError}
            errorId="career-duration-error"
          >
            <select
              ref={durationSelectRef}
              id="career-duration"
              name="durationYears"
              value={durationYears}
              onChange={(e) => setDurationYears(Number(e.target.value))}
              aria-required="true"
              aria-invalid={Boolean(validation.durationError)}
              aria-describedby={
                validation.durationError ? 'career-duration-error' : undefined
              }
              className={validation.durationError ? styles.inputError : ''}
            >
              {CAREER_RULES.SELECTABLE_DURATION_YEARS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} {yr === 1 ? 'Año' : 'Años'} (
                  {yr * CAREER_RULES.TERMS_PER_YEAR} cuatrimestres)
                </option>
              ))}
            </select>
          </FormField>

          <FormField htmlFor="career-status" label="Estado operativo">
            <select
              id="career-status"
              name="careerStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value as EntityStatus)}
            >
              <option value={ENTITY_STATUS.ACTIVE}>
                Activa (habilitada para inscripción)
              </option>
              <option value={ENTITY_STATUS.INACTIVE}>
                Inactiva (solo consulta o archivo)
              </option>
            </select>
          </FormField>
        </div>

        <FormField htmlFor="career-desc" label="Descripción y alcance">
          <textarea
            id="career-desc"
            name="careerDescription"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Resumen del perfil profesional u ordenanza del Consejo Superior…"
          />
        </FormField>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleRequestClose}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.primaryBtn}>
            {careerToEdit ? 'Guardar cambios' : 'Crear carrera'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
