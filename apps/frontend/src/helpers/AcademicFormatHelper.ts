import {
  CORRELATIVITY_LABELS_BY_TYPE,
  CORRELATIVITY_TYPE_ORDER,
  ENTITY_STATUS,
  ENTITY_STATUS_LABELS,
  SUBJECT_PERIODS,
  SUBJECT_RULES,
} from '../constants'
import type {
  CorrelativityLabels,
  CorrelativityType,
  EntityStatus,
  SubjectPeriod,
} from '../types'

export class AcademicFormatHelper {
  static getPeriodOrderIndex(
    year: number | null,
    period: SubjectPeriod | null,
  ): number {
    if (year === null || period === null) {
      return SUBJECT_RULES.UNASSIGNED_SORT_INDEX
    }

    const periodOffset =
      period === SUBJECT_PERIODS.FIRST
        ? SUBJECT_RULES.FIRST_PERIOD_SORT_OFFSET
        : period === SUBJECT_PERIODS.SECOND
          ? SUBJECT_RULES.SECOND_PERIOD_SORT_OFFSET
          : SUBJECT_RULES.ANNUAL_PERIOD_SORT_OFFSET

    return year * SUBJECT_RULES.YEAR_SORT_MULTIPLIER + periodOffset
  }

  static formatPeriodLabel(
    year: number | null,
    period: SubjectPeriod | null,
  ): string {
    if (year === null || period === null) {
      return 'Sin asignar (Banco)'
    }
    if (period === SUBJECT_PERIODS.ANNUAL) {
      return `${year}° Año · Anual`
    }
    return `${year}° Año · ${period}° Cuat.`
  }

  static formatCorrelativityTypeLabel(
    type: CorrelativityType,
  ): CorrelativityLabels {
    return CORRELATIVITY_LABELS_BY_TYPE[type]
  }

  static getNextCorrelativityType(current: CorrelativityType): CorrelativityType {
    const currentIndex = CORRELATIVITY_TYPE_ORDER.indexOf(current)
    const nextIndex = (currentIndex + 1) % CORRELATIVITY_TYPE_ORDER.length
    return CORRELATIVITY_TYPE_ORDER[nextIndex]
  }

  static formatEntityStatus(status: EntityStatus): string {
    return ENTITY_STATUS_LABELS[status]
  }

  static getOppositeEntityStatus(status: EntityStatus): EntityStatus {
    return status === ENTITY_STATUS.ACTIVE
      ? ENTITY_STATUS.INACTIVE
      : ENTITY_STATUS.ACTIVE
  }
}
