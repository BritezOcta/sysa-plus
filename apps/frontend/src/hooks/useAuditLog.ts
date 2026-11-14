import { useState } from 'react'
import { CURRENT_ACADEMIC_USER, ID_PREFIXES } from '../constants'
import { INITIAL_AUDIT_LOGS } from '../data/mockAcademicData'
import { IdAndDateHelper } from '../helpers'
import type {
  AuditActionType,
  AuditEntityType,
  AuditLogEntry,
} from '../types'

export function useAuditLog() {
  // Mantenido en memoria a partir del seed inicial para un entorno reproducible
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => [
    ...INITIAL_AUDIT_LOGS,
  ])
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)
  const [unreadAuditCount, setUnreadAuditCount] = useState(0)

  function recordAudit(
    actionType: AuditActionType,
    entity: AuditEntityType,
    summary: string,
    details: string,
  ) {
    const newEntry: AuditLogEntry = {
      id: IdAndDateHelper.createId(ID_PREFIXES.AUDIT),
      timestamp: IdAndDateHelper.currentIsoTimestamp(),
      user: CURRENT_ACADEMIC_USER.FULL_NAME,
      role: CURRENT_ACADEMIC_USER.ROLE_AUDIT,
      actionType,
      entity,
      summary,
      details,
    }
    setAuditLogs((prev) => [newEntry, ...prev])
    if (!auditDrawerOpen) {
      setUnreadAuditCount((count) => count + 1)
    }
  }

  function openAuditDrawer() {
    setAuditDrawerOpen(true)
    setUnreadAuditCount(0)
  }

  function closeAuditDrawer() {
    setAuditDrawerOpen(false)
  }

  function resetAuditLogs() {
    setAuditLogs([...INITIAL_AUDIT_LOGS])
    setUnreadAuditCount(0)
  }

  return {
    auditLogs,
    auditDrawerOpen,
    unreadAuditCount,
    recordAudit,
    openAuditDrawer,
    closeAuditDrawer,
    resetAuditLogs,
  }
}
