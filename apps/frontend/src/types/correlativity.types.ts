import type { CorrelativityType } from './academic.types'

export interface CycleCheckResult {
  hasCycle: boolean
  cyclePath: string[]
}

export interface CycleConflictNode {
  code: string
  name: string
}

export interface ConnectedChain {
  directPrereqIds: Set<string>
  indirectPrereqIds: Set<string>
  directUnlockedIds: Set<string>
  indirectUnlockedIds: Set<string>
  upstreamEdgeIds: Set<string>
  downstreamEdgeIds: Set<string>
}

export interface PendingRequirement {
  requiresSubjectId: string
  type: CorrelativityType
}

export interface CorrelativityLabels {
  short: string
  full: string
  condition: string
  target: string
  badgeCode: string
}
