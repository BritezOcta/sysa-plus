import {
  ENTITY_STATUS,
  SUBJECT_PERIODS,
  SUBJECT_RULES,
} from '../../../constants'
import type {
  Career,
  EntityStatus,
  SubjectPeriod,
  SubjectValidationResult,
} from '../../../types'
import FormField from '../../ui/FormField'
import styles from '../Modals.module.css'

interface SubjectMetadataFieldsProps {
  code: string
  careerId: string
  name: string
  weeklyHours: number
  totalHours: number
  isUnassigned: boolean
  year: number
  period: SubjectPeriod
  enrolledStudents: number
  status: EntityStatus
  careers: Career[]
  selectedCareer: Career
  validation: SubjectValidationResult
  codeInputRef: React.RefObject<HTMLInputElement | null>
  nameInputRef: React.RefObject<HTMLInputElement | null>
  weeklyInputRef: React.RefObject<HTMLInputElement | null>
  totalInputRef: React.RefObject<HTMLInputElement | null>
  yearSelectRef: React.RefObject<HTMLSelectElement | null>
  onCodeChange: (value: string) => void
  onCareerChange: (careerId: string) => void
  onNameChange: (value: string) => void
  onWeeklyHoursChange: (value: number) => void
  onTotalHoursChange: (value: number) => void
  onUnassignedChange: (unassigned: boolean) => void
  onYearChange: (year: number) => void
  onPeriodChange: (period: SubjectPeriod) => void
  onEnrolledStudentsChange: (count: number) => void
  onStatusChange: (status: EntityStatus) => void
}

export default function SubjectMetadataFields({
  code,
  careerId,
  name,
  weeklyHours,
  totalHours,
  isUnassigned,
  year,
  period,
  enrolledStudents,
  status,
  careers,
  selectedCareer,
  validation,
  codeInputRef,
  nameInputRef,
  weeklyInputRef,
  totalInputRef,
  yearSelectRef,
  onCodeChange,
  onCareerChange,
  onNameChange,
  onWeeklyHoursChange,
  onTotalHoursChange,
  onUnassignedChange,
  onYearChange,
  onPeriodChange,
  onEnrolledStudentsChange,
  onStatusChange,
}: SubjectMetadataFieldsProps) {
  const careerYears = Array.from(
    { length: selectedCareer.durationYears },
    (_, idx) => idx + 1,
  )

  return (
    <div className={styles.columnSection}>
      <h3 className={styles.sectionTitle}>1. Datos de la materia</h3>

      <div className={styles.grid2}>
        <FormField
          htmlFor="subj-code"
          label="Código único"
          required
          error={validation.codeError}
          errorId="subj-code-error"
        >
          <input
            ref={codeInputRef}
            id="subj-code"
            name="subjectCode"
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            placeholder="Ej. ISI-306…"
            autoComplete="off"
            spellCheck={false}
            aria-required="true"
            aria-invalid={Boolean(validation.codeError)}
            aria-describedby={
              validation.codeError ? 'subj-code-error' : undefined
            }
            className={validation.codeError ? styles.inputError : ''}
          />
        </FormField>

        <FormField htmlFor="subj-career" label="Carrera asociada" required>
          <select
            id="subj-career"
            name="careerId"
            value={careerId}
            onChange={(e) => onCareerChange(e.target.value)}
          >
            {careers.map((car) => (
              <option key={car.id} value={car.id}>
                {car.code} — {car.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField
        htmlFor="subj-name"
        label="Nombre de la materia"
        required
        error={validation.nameError}
        errorId="subj-name-error"
      >
        <input
          ref={nameInputRef}
          id="subj-name"
          name="subjectName"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ej. Inteligencia Artificial Aplicada…"
          autoComplete="off"
          aria-required="true"
          aria-invalid={Boolean(validation.nameError)}
          aria-describedby={
            validation.nameError ? 'subj-name-error' : undefined
          }
          className={validation.nameError ? styles.inputError : ''}
        />
      </FormField>

      <div className={styles.grid2}>
        <FormField
          htmlFor="subj-weekly"
          label="Carga semanal (hs/sem)"
          required
          error={validation.weeklyError}
          errorId="subj-weekly-error"
        >
          <input
            ref={weeklyInputRef}
            id="subj-weekly"
            name="weeklyHours"
            type="number"
            min={SUBJECT_RULES.MIN_WEEKLY_HOURS}
            max={SUBJECT_RULES.MAX_WEEKLY_HOURS}
            value={weeklyHours}
            onChange={(e) => onWeeklyHoursChange(Number(e.target.value))}
            aria-required="true"
            aria-invalid={Boolean(validation.weeklyError)}
            aria-describedby={
              validation.weeklyError ? 'subj-weekly-error' : undefined
            }
            className={validation.weeklyError ? styles.inputError : ''}
          />
        </FormField>

        <FormField
          htmlFor="subj-total"
          label="Carga horaria total (hs)"
          required
          error={validation.totalError}
          errorId="subj-total-error"
        >
          <input
            ref={totalInputRef}
            id="subj-total"
            name="totalHours"
            type="number"
            min={SUBJECT_RULES.MIN_TOTAL_HOURS}
            max={SUBJECT_RULES.MAX_TOTAL_HOURS}
            value={totalHours}
            onChange={(e) => onTotalHoursChange(Number(e.target.value))}
            aria-required="true"
            aria-invalid={Boolean(validation.totalError)}
            aria-describedby={
              validation.totalError ? 'subj-total-error' : undefined
            }
            className={validation.totalError ? styles.inputError : ''}
          />
        </FormField>
      </div>

      <div className={styles.field}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={isUnassigned}
            onChange={(e) => onUnassignedChange(e.target.checked)}
          />
          <span>
            Dejar en el <strong>Banco de materias (sin asignar)</strong> para
            ubicarla más tarde en el plan
          </span>
        </label>
      </div>

      {!isUnassigned && (
        <div className={styles.grid2}>
          <FormField
            htmlFor="subj-year"
            label="Año del plan"
            error={validation.yearError}
            errorId="subj-year-error"
          >
            <select
              ref={yearSelectRef}
              id="subj-year"
              name="subjectYear"
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              aria-invalid={Boolean(validation.yearError)}
              aria-describedby={
                validation.yearError ? 'subj-year-error' : undefined
              }
              className={validation.yearError ? styles.inputError : ''}
            >
              {careerYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}° Año
                </option>
              ))}
            </select>
          </FormField>

          <FormField htmlFor="subj-period" label="Régimen / Cuatrimestre">
            <select
              id="subj-period"
              name="subjectPeriod"
              value={period}
              onChange={(e) => {
                const val = e.target.value
                onPeriodChange(
                  val === SUBJECT_PERIODS.ANNUAL
                    ? SUBJECT_PERIODS.ANNUAL
                    : (Number(val) as 1 | 2),
                )
              }}
            >
              <option value={SUBJECT_PERIODS.FIRST}>1° Cuatrimestre</option>
              <option value={SUBJECT_PERIODS.SECOND}>2° Cuatrimestre</option>
              <option value={SUBJECT_PERIODS.ANNUAL}>Anual</option>
            </select>
          </FormField>
        </div>
      )}

      <div className={styles.grid2}>
        <FormField
          htmlFor="subj-students"
          label="Alumnos cursando o inscriptos"
          hint="Si supera 0, el sistema bloqueará su eliminación física."
          hintId="subj-students-hint"
        >
          <input
            id="subj-students"
            name="enrolledStudents"
            type="number"
            min={SUBJECT_RULES.MIN_ENROLLED_STUDENTS}
            max={SUBJECT_RULES.MAX_ENROLLED_STUDENTS}
            value={enrolledStudents}
            onChange={(e) => onEnrolledStudentsChange(Number(e.target.value))}
            aria-describedby="subj-students-hint"
          />
        </FormField>

        <FormField htmlFor="subj-status" label="Estado operativo">
          <select
            id="subj-status"
            name="subjectStatus"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as EntityStatus)}
          >
            <option value={ENTITY_STATUS.ACTIVE}>Activa</option>
            <option value={ENTITY_STATUS.INACTIVE}>Inactiva</option>
          </select>
        </FormField>
      </div>
    </div>
  )
}
