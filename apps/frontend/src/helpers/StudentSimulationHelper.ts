import {
  CORRELATIVITY_TYPES,
  ENTITY_STATUS,
  STUDENT_SIM_STATUS,
  STUDENT_SIM_STATUS_ORDER,
  SUBJECT_RULES,
} from '../constants'
import type {
  Correlativity,
  MissingRequirementItem,
  StudentSimStatus,
  Subject,
  SubjectSimulationEvaluation,
} from '../types'

export class StudentSimulationHelper {
  static evaluateStudentSimulation(
    subjects: Subject[],
    correlativities: Correlativity[],
    simState: Record<string, StudentSimStatus>,
  ): Record<string, SubjectSimulationEvaluation> {
    const subjectMap = new Map(subjects.map((s) => [s.id, s]))
    const result: Record<string, SubjectSimulationEvaluation> = {}

    for (const subj of subjects) {
      const currentStatus =
        simState[subj.id] ?? STUDENT_SIM_STATUS.PENDING
      const requirements = correlativities.filter(
        (c) => c.subjectId === subj.id,
      )

      const missingCursar: MissingRequirementItem[] = []
      const missingRendir: MissingRequirementItem[] = []

      for (const req of requirements) {
        const prereqSubj = subjectMap.get(req.requiresSubjectId)
        if (!prereqSubj || prereqSubj.status === ENTITY_STATUS.INACTIVE) {
          continue
        }
        const prereqStatus =
          simState[prereqSubj.id] ?? STUDENT_SIM_STATUS.PENDING

        if (req.type === CORRELATIVITY_TYPES.REGULAR_TO_ENROLL) {
          const satisfies =
            prereqStatus === STUDENT_SIM_STATUS.REGULAR ||
            prereqStatus === STUDENT_SIM_STATUS.APPROVED
          if (!satisfies) {
            missingCursar.push({ subject: prereqSubj, type: req.type })
            missingRendir.push({ subject: prereqSubj, type: req.type })
          }
        } else if (req.type === CORRELATIVITY_TYPES.APPROVED_TO_ENROLL) {
          const satisfies = prereqStatus === STUDENT_SIM_STATUS.APPROVED
          if (!satisfies) {
            missingCursar.push({ subject: prereqSubj, type: req.type })
            missingRendir.push({ subject: prereqSubj, type: req.type })
          }
        } else if (req.type === CORRELATIVITY_TYPES.APPROVED_FOR_EXAM) {
          const satisfies = prereqStatus === STUDENT_SIM_STATUS.APPROVED
          if (!satisfies) {
            missingRendir.push({ subject: prereqSubj, type: req.type })
          }
        }
      }

      result[subj.id] = {
        status: currentStatus,
        canCursar: missingCursar.length === 0,
        canRendir: missingRendir.length === 0,
        missingCursar,
        missingRendir,
      }
    }

    return result
  }

  static getNextSimulationStatus(
    current: StudentSimStatus | undefined,
  ): StudentSimStatus {
    const resolved = current ?? STUDENT_SIM_STATUS.PENDING
    const index = STUDENT_SIM_STATUS_ORDER.indexOf(resolved)
    const nextIndex = (index + 1) % STUDENT_SIM_STATUS_ORDER.length
    return STUDENT_SIM_STATUS_ORDER[nextIndex]
  }

  static buildApprovedFirstYearState(
    subjects: Subject[],
  ): Record<string, StudentSimStatus> {
    const state: Record<string, StudentSimStatus> = {}
    for (const subject of subjects) {
      if (subject.year === SUBJECT_RULES.DEFAULT_YEAR) {
        state[subject.id] = STUDENT_SIM_STATUS.APPROVED
      }
    }
    return state
  }
}
