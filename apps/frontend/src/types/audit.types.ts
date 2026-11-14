export type AuditActionType =
  | 'ALTA'
  | 'EDICION'
  | 'BAJA'
  | 'INACTIVACION'
  | 'CORRELATIVIDAD'
  | 'REUBICACION'

export type AuditEntityType = 'CARRERA' | 'MATERIA' | 'CORRELATIVIDAD'

export type AuditEntityFilter = 'ALL' | AuditEntityType

export interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  role: string
  actionType: AuditActionType
  entity: AuditEntityType
  summary: string
  details: string
}
