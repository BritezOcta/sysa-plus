import type { CorrelativityType, Subject } from './academic.types'

export type StudentSimStatus = 'pendiente' | 'regularizada' | 'aprobada'

export interface MissingRequirementItem {
  subject: Subject
  type: CorrelativityType
}

export interface SubjectSimulationEvaluation {
  status: StudentSimStatus
  canCursar: boolean
  canRendir: boolean
  missingCursar: MissingRequirementItem[]
  missingRendir: MissingRequirementItem[]
}
