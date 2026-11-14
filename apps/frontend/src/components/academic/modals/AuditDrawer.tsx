import { useState } from 'react'
import {
  AUDIT_ENTITY_FILTER_LABELS,
  AUDIT_FILTER_OPTIONS,
  FILTER_VALUES,
} from '../../../constants'
import type { AuditEntityFilter, AuditLogEntry } from '../../../types'
import DrawerShell from '../../ui/DrawerShell'
import styles from '../Modals.module.css'
import AuditLogItem from './AuditLogItem'

interface AuditDrawerProps {
  logs: AuditLogEntry[]
  onClose: () => void
}

export default function AuditDrawer({ logs, onClose }: AuditDrawerProps) {
  const [filterEntity, setFilterEntity] = useState<AuditEntityFilter>(
    FILTER_VALUES.ALL,
  )

  const filteredLogs =
    filterEntity === FILTER_VALUES.ALL
      ? logs
      : logs.filter((entry) => entry.entity === filterEntity)

  return (
    <DrawerShell
      titleId="audit-drawer-title"
      title="Historial de auditoría académica"
      subtitle="Registro cronológico de altas, ediciones y bajas del módulo"
      closeAriaLabel="Cerrar historial de auditoría"
      onClose={onClose}
    >
      <div
        className={styles.drawerFilterRow}
        role="group"
        aria-label="Filtrar registros por entidad"
      >
        {AUDIT_FILTER_OPTIONS.map((ent) => (
          <button
            key={ent}
            type="button"
            aria-pressed={filterEntity === ent}
            onClick={() => setFilterEntity(ent)}
            className={`${styles.filterPill} ${
              filterEntity === ent ? styles.filterPillActive : ''
            }`}
          >
            {ent === FILTER_VALUES.ALL
              ? `${AUDIT_ENTITY_FILTER_LABELS[ent]} (${logs.length})`
              : AUDIT_ENTITY_FILTER_LABELS[ent]}
          </button>
        ))}
      </div>

      <div className={styles.auditList}>
        {filteredLogs.length === 0 ? (
          <div className={styles.emptyAuditState}>
            <p>
              No hay registros de auditoría para el filtro seleccionado (
              <strong>{AUDIT_ENTITY_FILTER_LABELS[filterEntity]}</strong>).
            </p>
            {filterEntity !== FILTER_VALUES.ALL && (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setFilterEntity(FILTER_VALUES.ALL)}
              >
                Mostrar todos los registros
              </button>
            )}
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <AuditLogItem key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </DrawerShell>
  )
}
