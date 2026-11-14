import { ID_PREFIXES } from '../constants'
import type {
  ConnectedChain,
  Correlativity,
  CycleCheckResult,
  CycleConflictNode,
  PendingRequirement,
  Subject,
} from '../types'

export class CorrelativityGraphHelper {
  /**
   * Agregar `requiresSubjectId -> subjectId` crea un ciclo si y solo si `requiresSubjectId`
   * ya depende (directa o transitivamente) de `subjectId`. Recorre en anchura (BFS)
   * desde `subjectId` para reconstruir la cadena exacta del conflicto.
   */
  static detectCircularDependency(
    correlativities: Correlativity[],
    subjectId: string,
    requiresSubjectId: string,
  ): CycleCheckResult {
    if (subjectId === requiresSubjectId) {
      return {
        hasCycle: true,
        cyclePath: [subjectId, requiresSubjectId],
      }
    }

    const adjacency = new Map<string, string[]>()
    for (const corr of correlativities) {
      const list = adjacency.get(corr.requiresSubjectId) ?? []
      if (!list.includes(corr.subjectId)) {
        list.push(corr.subjectId)
      }
      adjacency.set(corr.requiresSubjectId, list)
    }

    const visited = new Set<string>([subjectId])
    const parentMap = new Map<string, string>()
    const queue: string[] = [subjectId]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current === requiresSubjectId) {
        const path: string[] = [requiresSubjectId]
        let step: string | undefined = requiresSubjectId
        while (step && step !== subjectId) {
          step = parentMap.get(step)
          if (step) path.unshift(step)
        }
        path.push(subjectId)
        return {
          hasCycle: true,
          cyclePath: path,
        }
      }

      const neighbors = adjacency.get(current) ?? []
      for (const next of neighbors) {
        if (!visited.has(next)) {
          visited.add(next)
          parentMap.set(next, current)
          queue.push(next)
        }
      }
    }

    return {
      hasCycle: false,
      cyclePath: [],
    }
  }

  static getConnectedChain(
    subjectId: string | null,
    correlativities: Correlativity[],
  ): ConnectedChain {
    const directPrereqIds = new Set<string>()
    const indirectPrereqIds = new Set<string>()
    const directUnlockedIds = new Set<string>()
    const indirectUnlockedIds = new Set<string>()
    const upstreamEdgeIds = new Set<string>()
    const downstreamEdgeIds = new Set<string>()

    if (!subjectId) {
      return {
        directPrereqIds,
        indirectPrereqIds,
        directUnlockedIds,
        indirectUnlockedIds,
        upstreamEdgeIds,
        downstreamEdgeIds,
      }
    }

    const upQueue: Array<{ id: string; depth: number }> = [
      { id: subjectId, depth: 0 },
    ]
    const visitedUp = new Set<string>([subjectId])

    while (upQueue.length > 0) {
      const { id, depth } = upQueue.shift()!
      for (const corr of correlativities) {
        if (corr.subjectId === id) {
          upstreamEdgeIds.add(corr.id)
          const prereq = corr.requiresSubjectId
          if (depth === 0) {
            directPrereqIds.add(prereq)
          } else if (!directPrereqIds.has(prereq)) {
            indirectPrereqIds.add(prereq)
          }
          if (!visitedUp.has(prereq)) {
            visitedUp.add(prereq)
            upQueue.push({ id: prereq, depth: depth + 1 })
          }
        }
      }
    }

    const downQueue: Array<{ id: string; depth: number }> = [
      { id: subjectId, depth: 0 },
    ]
    const visitedDown = new Set<string>([subjectId])

    while (downQueue.length > 0) {
      const { id, depth } = downQueue.shift()!
      for (const corr of correlativities) {
        if (corr.requiresSubjectId === id) {
          downstreamEdgeIds.add(corr.id)
          const target = corr.subjectId
          if (depth === 0) {
            directUnlockedIds.add(target)
          } else if (!directUnlockedIds.has(target)) {
            indirectUnlockedIds.add(target)
          }
          if (!visitedDown.has(target)) {
            visitedDown.add(target)
            downQueue.push({ id: target, depth: depth + 1 })
          }
        }
      }
    }

    return {
      directPrereqIds,
      indirectPrereqIds,
      directUnlockedIds,
      indirectUnlockedIds,
      upstreamEdgeIds,
      downstreamEdgeIds,
    }
  }

  static mapCyclePathToNodes(
    cyclePath: string[],
    subjects: Subject[],
  ): CycleConflictNode[] {
    const subjectMap = new Map(subjects.map((s) => [s.id, s]))
    return cyclePath.map((id) => {
      const subject = subjectMap.get(id)
      return {
        code: subject?.code ?? id,
        name: subject?.name ?? 'Materia',
      }
    })
  }

  static formatCycleChainText(
    cyclePath: string[],
    subjects: Subject[],
  ): string {
    const subjectMap = new Map(subjects.map((s) => [s.id, s]))
    return cyclePath
      .map((id) => {
        const found = subjectMap.get(id)
        return found ? `${found.code} (${found.name})` : id
      })
      .join(' ➔ ')
  }

  static buildSimulatedCorrelativitiesForDraft(
    allCorrelativities: Correlativity[],
    editingSubjectId: string,
    careerId: string,
    draftRequirements: PendingRequirement[],
    excludingRequiresId: string,
  ): Correlativity[] {
    const otherCorrs = allCorrelativities.filter(
      (c) => c.subjectId !== editingSubjectId,
    )
    const draftCorrs: Correlativity[] = draftRequirements
      .filter((r) => r.requiresSubjectId !== excludingRequiresId)
      .map((r, idx) => ({
        id: `${ID_PREFIXES.TEMP_REQUIREMENT}-${idx}`,
        careerId,
        subjectId: editingSubjectId,
        requiresSubjectId: r.requiresSubjectId,
        type: r.type,
        createdAt: '',
      }))

    return [...otherCorrs, ...draftCorrs]
  }

  static serializeRequirements(requirements: PendingRequirement[]): string {
    return [...requirements]
      .sort((a, b) => a.requiresSubjectId.localeCompare(b.requiresSubjectId))
      .map((r) => `${r.requiresSubjectId}:${r.type}`)
      .join('|')
  }

  static areRequirementsEqual(
    first: PendingRequirement[],
    second: PendingRequirement[],
  ): boolean {
    return (
      CorrelativityGraphHelper.serializeRequirements(first) ===
      CorrelativityGraphHelper.serializeRequirements(second)
    )
  }
}
