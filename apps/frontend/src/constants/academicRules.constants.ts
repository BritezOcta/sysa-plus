import type {
  CorrelativityLabels,
  CorrelativityType,
  EntityStatus,
  PeriodColumnDefinition,
  StudentSimStatus,
  SubjectPeriod,
} from '../types'

export const ENTITY_STATUS: Record<'ACTIVE' | 'INACTIVE', EntityStatus> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const

export const ENTITY_STATUS_LABELS: Record<EntityStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
} as const

export const SUBJECT_PERIODS: Record<'FIRST' | 'SECOND' | 'ANNUAL', SubjectPeriod> = {
  FIRST: 1,
  SECOND: 2,
  ANNUAL: 'anual',
} as const

export const CORRELATIVITY_TYPES: Record<
  'REGULAR_TO_ENROLL' | 'APPROVED_TO_ENROLL' | 'APPROVED_FOR_EXAM',
  CorrelativityType
> = {
  REGULAR_TO_ENROLL: 'regularizada_cursar',
  APPROVED_TO_ENROLL: 'aprobada_cursar',
  APPROVED_FOR_EXAM: 'aprobada_rendir',
} as const

export const CORRELATIVITY_TYPE_ORDER: readonly CorrelativityType[] = [
  CORRELATIVITY_TYPES.REGULAR_TO_ENROLL,
  CORRELATIVITY_TYPES.APPROVED_TO_ENROLL,
  CORRELATIVITY_TYPES.APPROVED_FOR_EXAM,
] as const

export const CORRELATIVITY_LABELS_BY_TYPE: Record<
  CorrelativityType,
  CorrelativityLabels
> = {
  regularizada_cursar: {
    short: 'REG · Cursar',
    full: 'Regularizada para Cursar',
    condition: 'Regularizada',
    target: 'Para Cursar',
    badgeCode: 'REG',
  },
  aprobada_cursar: {
    short: 'APR · Cursar',
    full: 'Aprobada para Cursar',
    condition: 'Aprobada',
    target: 'Para Cursar',
    badgeCode: 'APR',
  },
  aprobada_rendir: {
    short: 'APR · Rendir',
    full: 'Aprobada para Rendir Final',
    condition: 'Aprobada',
    target: 'Para Rendir',
    badgeCode: 'FIN',
  },
} as const

export const STUDENT_SIM_STATUS: Record<
  'PENDING' | 'REGULAR' | 'APPROVED',
  StudentSimStatus
> = {
  PENDING: 'pendiente',
  REGULAR: 'regularizada',
  APPROVED: 'aprobada',
} as const

export const STUDENT_SIM_STATUS_ORDER: readonly StudentSimStatus[] = [
  STUDENT_SIM_STATUS.PENDING,
  STUDENT_SIM_STATUS.REGULAR,
  STUDENT_SIM_STATUS.APPROVED,
] as const

export const INITIAL_SIMULATION_STATE: Readonly<
  Record<string, StudentSimStatus>
> = {
  'sub-isi-101': STUDENT_SIM_STATUS.APPROVED,
  'sub-isi-102': STUDENT_SIM_STATUS.REGULAR,
  'sub-isi-103': STUDENT_SIM_STATUS.APPROVED,
} as const

export const CAREER_RULES = {
  MIN_DURATION_YEARS: 1,
  MAX_DURATION_YEARS: 8,
  DEFAULT_DURATION_YEARS: 5,
  SELECTABLE_DURATION_YEARS: [1, 2, 3, 4, 5, 6] as const,
  TERMS_PER_YEAR: 2,
  MIN_SYSTEM_CAREERS: 1,
  DEFAULT_STUDY_PLAN: 'Plan 2026 (Ord. 1950)',
  DEFAULT_DESCRIPTION:
    'Oferta académica oficial de la UTN Facultad Regional General Pacheco.',
  FALLBACK_CAREER_ID: 'car-isi',
} as const

export const SUBJECT_RULES = {
  DEFAULT_YEAR: 1,
  DEFAULT_PERIOD: 1 as SubjectPeriod,
  DEFAULT_WEEKLY_HOURS: 6,
  DEFAULT_TOTAL_HOURS: 96,
  WEEKS_PER_TERM: 16,
  WEEKS_PER_YEAR: 32,
  MIN_WEEKLY_HOURS: 1,
  MAX_WEEKLY_HOURS: 20,
  MIN_TOTAL_HOURS: 16,
  MAX_TOTAL_HOURS: 500,
  MIN_ENROLLED_STUDENTS: 0,
  MAX_ENROLLED_STUDENTS: 1000,
  DEFAULT_ENROLLED_STUDENTS: 0,
  UNASSIGNED_SORT_INDEX: 999,
  YEAR_SORT_MULTIPLIER: 10,
  FIRST_PERIOD_SORT_OFFSET: 1,
  ANNUAL_PERIOD_SORT_OFFSET: 1.5,
  SECOND_PERIOD_SORT_OFFSET: 2,
} as const

export const ACADEMIC_PERIOD_COLUMNS: readonly PeriodColumnDefinition[] = [
  { period: SUBJECT_PERIODS.FIRST, title: '1° Cuatrimestre' },
  { period: SUBJECT_PERIODS.SECOND, title: '2° Cuatrimestre' },
] as const

export const FILTER_VALUES = {
  ALL: 'ALL',
  BANK: 'BANK',
} as const

export const ID_PREFIXES = {
  CAREER: 'car',
  SUBJECT: 'sub',
  CORRELATIVITY: 'cor',
  AUDIT: 'aud',
  TOAST: 'toast',
  TEMP_REQUIREMENT: 'temp',
} as const
