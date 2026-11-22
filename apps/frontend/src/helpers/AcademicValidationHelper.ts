import {
  CAREER_RULES,
  SUBJECT_PERIODS,
  SUBJECT_RULES,
} from '../constants'
import type {
  Career,
  CareerFormValues,
  CareerValidationResult,
  Subject,
  SubjectFormValues,
  SubjectPeriod,
  SubjectValidationResult,
} from '../types'

export class AcademicValidationHelper {
  static validateCareerForm(
    values: CareerFormValues,
    existingCareers: Career[],
    editingCareerId: string | undefined,
    touched: boolean,
  ): CareerValidationResult {
    const normalizedCode = values.code.trim().toUpperCase()
    const duplicateCareer = existingCareers.find(
      (career) =>
        career.code.toUpperCase() === normalizedCode &&
        career.id !== editingCareerId,
    )

    const codeMissing = !normalizedCode
    const nameMissing = !values.name.trim()
    const planMissing = !values.studyPlan.trim()
    const durationInvalid =
      !values.durationYears ||
      values.durationYears < CAREER_RULES.MIN_DURATION_YEARS ||
      values.durationYears > CAREER_RULES.MAX_DURATION_YEARS

    const missingFields: string[] = []
    if (codeMissing) missingFields.push('Código de carrera')
    if (nameMissing) missingFields.push('Nombre de la carrera')
    if (planMissing) missingFields.push('Plan de estudios')
    if (durationInvalid) {
      missingFields.push(
        `Duración válida (${CAREER_RULES.MIN_DURATION_YEARS} a ${CAREER_RULES.MAX_DURATION_YEARS} años)`,
      )
    }

    const codeError = duplicateCareer
      ? `El código ${normalizedCode} ya pertenece a "${duplicateCareer.name}". Ingresá uno diferente.`
      : touched && codeMissing
        ? 'Ingresá el código único de la carrera (ej. ISI-2026).'
        : null

    const planError =
      touched && planMissing
        ? 'Indicá el plan de estudios u ordenanza vigente.'
        : null

    const nameError =
      touched && nameMissing
        ? 'Ingresá el nombre completo de la carrera.'
        : null

    const durationError =
      touched && durationInvalid
        ? `Seleccioná una duración válida entre ${CAREER_RULES.MIN_DURATION_YEARS} y ${CAREER_RULES.MAX_DURATION_YEARS} años.`
        : null

    const isValid =
      !duplicateCareer &&
      !codeMissing &&
      !nameMissing &&
      !planMissing &&
      !durationInvalid

    return {
      normalizedCode,
      duplicateCareer,
      codeMissing,
      nameMissing,
      planMissing,
      durationInvalid,
      missingFields,
      codeError,
      planError,
      nameError,
      durationError,
      isValid,
    }
  }

  static validateSubjectForm(
    values: SubjectFormValues,
    selectedCareer: Career,
    allSubjects: Subject[],
    editingSubjectId: string | undefined,
    touched: boolean,
  ): SubjectValidationResult {
    const normalizedCode = values.code.trim().toUpperCase()
    const duplicateSubject = allSubjects.find(
      (subj) =>
        subj.code.toUpperCase() === normalizedCode &&
        subj.id !== editingSubjectId,
    )

    const invalidYearForCareer =
      !values.isUnassigned &&
      (values.year < SUBJECT_RULES.DEFAULT_YEAR ||
        values.year > selectedCareer.durationYears)

    const codeMissing = !normalizedCode
    const nameMissing = !values.name.trim()
    const weeklyInvalid = !values.weeklyHours || values.weeklyHours <= 0
    const totalInvalid = !values.totalHours || values.totalHours <= 0

    const missingFields: string[] = []
    if (codeMissing) missingFields.push('Código de materia')
    if (nameMissing) missingFields.push('Nombre de la materia')
    if (weeklyInvalid) missingFields.push('Carga horaria semanal')
    if (totalInvalid) missingFields.push('Carga horaria total')

    const codeError = duplicateSubject
      ? `El código ${normalizedCode} ya existe en "${duplicateSubject.name}". Ingresá uno único.`
      : touched && codeMissing
        ? 'Ingresá el código único de la materia (ej. ISI-306).'
        : null

    const nameError =
      touched && nameMissing
        ? 'Ingresá el nombre oficial de la materia.'
        : null

    const weeklyError =
      touched && weeklyInvalid
        ? 'Indicá una carga semanal mayor a 0 horas.'
        : null

    const totalError =
      touched && totalInvalid
        ? 'Indicá una carga horaria total mayor a 0 horas.'
        : null

    const yearError = invalidYearForCareer
      ? `El año debe estar entre 1 y ${selectedCareer.durationYears} para ${selectedCareer.code}.`
      : null

    const isValid =
      !duplicateSubject &&
      !codeMissing &&
      !nameMissing &&
      !weeklyInvalid &&
      !totalInvalid &&
      !invalidYearForCareer

    return {
      normalizedCode,
      duplicateSubjectName: duplicateSubject?.name ?? null,
      invalidYearForCareer,
      codeMissing,
      nameMissing,
      weeklyInvalid,
      totalInvalid,
      missingFields,
      codeError,
      nameError,
      weeklyError,
      totalError,
      yearError,
      isValid,
    }
  }

  static calculateSuggestedTotalHours(
    weeklyHours: number,
    period: SubjectPeriod,
  ): number {
    const weeksMultiplier =
      period === SUBJECT_PERIODS.ANNUAL
        ? SUBJECT_RULES.WEEKS_PER_YEAR
        : SUBJECT_RULES.WEEKS_PER_TERM
    return Math.max(SUBJECT_RULES.MIN_TOTAL_HOURS, weeklyHours * weeksMultiplier)
  }

  static getTotalEnrolledStudentsInCareer(
    careerId: string,
    subjects: Subject[],
  ): number {
    return subjects
      .filter((s) => s.careerId === careerId)
      .reduce((acc, s) => acc + s.enrolledStudents, 0)
  }
}
