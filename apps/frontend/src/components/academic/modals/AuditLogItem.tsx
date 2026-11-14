import { IdAndDateHelper } from '../../../helpers'
import type { AuditLogEntry } from '../../../types'
import styles from '../Modals.module.css'

interface AuditLogItemProps {
  entry: AuditLogEntry
}

export default function AuditLogItem({ entry }: AuditLogItemProps) {
  const formattedDate = IdAndDateHelper.formatAuditTimestamp(entry.timestamp)

  return (
    <article className={styles.auditItem}>
      <div className={styles.auditMetaTop}>
        <span
          className={`${styles.auditBadge} ${
            styles[`audit_${entry.actionType}`] ?? ''
          }`}
        >
          {entry.actionType} · {entry.entity}
        </span>
        <time className={styles.auditTime}>{formattedDate}</time>
      </div>
      <h3 className={styles.auditSummary}>{entry.summary}</h3>
      <p className={styles.auditDetails}>{entry.details}</p>
      <div className={styles.auditAuthor}>
        Responsable: <strong>{entry.user}</strong> ({entry.role})
      </div>
    </article>
  )
}
