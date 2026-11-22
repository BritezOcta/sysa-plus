import type { EntityStatus, SubjectPeriod } from './academic.types'

export type ViewMode = 'canvas' | 'table'

export type YearFilterValue = 'ALL' | 'BANK' | string

export type StatusFilterValue = 'ALL' | EntityStatus

export interface PortCoords {
  inX: number
  inY: number
  outX: number
  outY: number
}

export interface CableDragState {
  sourceSubjectId: string
  startX: number
  startY: number
  currentX: number
  currentY: number
  hoveredTargetId: string | null
  isStickyClickMode: boolean
}

export interface PeriodColumnDefinition {
  period: SubjectPeriod
  title: string
}
