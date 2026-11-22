import type {
  AuditActionType,
  AuditEntityFilter,
  AuditEntityType,
} from '../types'

export const AUDIT_ACTION_TYPES: Record<AuditActionType, AuditActionType> = {
  ALTA: 'ALTA',
  EDICION: 'EDICION',
  BAJA: 'BAJA',
  INACTIVACION: 'INACTIVACION',
  CORRELATIVIDAD: 'CORRELATIVIDAD',
  REUBICACION: 'REUBICACION',
} as const

export const AUDIT_ENTITY_TYPES: Record<AuditEntityType, AuditEntityType> = {
  CARRERA: 'CARRERA',
  MATERIA: 'MATERIA',
  CORRELATIVIDAD: 'CORRELATIVIDAD',
} as const

export const AUDIT_FILTER_OPTIONS: readonly AuditEntityFilter[] = [
  'ALL',
  'CARRERA',
  'MATERIA',
  'CORRELATIVIDAD',
] as const

export const AUDIT_ENTITY_FILTER_LABELS: Record<AuditEntityFilter, string> = {
  ALL: 'Todos',
  CARRERA: 'Carreras',
  MATERIA: 'Materias',
  CORRELATIVIDAD: 'Correlatividades',
} as const

export const CURRENT_ACADEMIC_USER = {
  INITIALS: 'CG',
  FULL_NAME: 'Ing. Carlos Gómez',
  ROLE_SHORT: 'Director Académico',
  ROLE_AUDIT: 'Director Académico FRGP',
} as const

export const LOCALE_CONFIG = {
  AR: 'es-AR',
} as const
