import { useState } from 'react'
import type { AdminUserRow } from '../../api/adminUsers.api'
import styles from '../academic/Modals.module.css'
import FormField from '../ui/FormField'
import ModalShell from '../ui/ModalShell'

const REASON_MAX = 500

interface StudentStatusModalProps {
  user: AdminUserRow
  submitting: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

/** RF-10: confirma la baja o reactivación de un alumno pidiendo el motivo. */
export default function StudentStatusModal({ user, submitting, onClose, onConfirm }: StudentStatusModalProps) {
  const [reason, setReason] = useState('')
  const deactivating = user.isActive
  const canConfirm = reason.trim().length > 0 && !submitting

  return (
    <ModalShell
      titleId="student-status-title"
      describedById="student-status-desc"
      title={deactivating ? `Dar de baja a ${user.fullName}` : `Reactivar a ${user.fullName}`}
      subtitle={`DNI ${user.dni}${user.legajo ? ` · Legajo ${user.legajo}` : ''}`}
      closeAriaLabel="Cerrar"
      tone={deactivating ? 'danger' : 'default'}
      canClose={!submitting}
      onRequestClose={onClose}
    >
      <form
        className={styles.formBody}
        onSubmit={(e) => {
          e.preventDefault()
          if (canConfirm) onConfirm(reason.trim())
        }}
      >
        <p id="student-status-desc" className={styles.warningLead}>
          {deactivating
            ? 'Se cancelarán sus inscripciones a cursadas que todavía no empezaron y a finales futuros. Las cursadas en curso se conservan. No podrá iniciar sesión.'
            : 'Podrá volver a iniciar sesión e inscribirse. Las inscripciones canceladas no se restauran.'}
        </p>
        <FormField htmlFor="student-status-reason" label="Motivo" required hint={`${reason.length}/${REASON_MAX}`}>
          <textarea
            id="student-status-reason"
            rows={3}
            maxLength={REASON_MAX}
            value={reason}
            placeholder={deactivating ? 'Ej.: abandono, sanción disciplinaria' : 'Ej.: reincorporación'}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </FormField>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className={deactivating ? styles.dangerBtn : styles.primaryBtn} disabled={!canConfirm}>
            {submitting ? 'Guardando…' : deactivating ? 'Dar de baja' : 'Reactivar'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
