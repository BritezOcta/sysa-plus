import { useRef } from 'react'
import type { ConfirmTone } from '../../../types'
import ModalShell from '../../ui/ModalShell'
import styles from '../Modals.module.css'

interface ConfirmActionModalProps {
  title: string
  description: string
  impactDetail?: string
  confirmLabel: string
  tone?: ConfirmTone
  onClose: () => void
  onConfirm: () => void
}

export default function ConfirmActionModal({
  title,
  description,
  impactDetail,
  confirmLabel,
  tone = 'danger',
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <ModalShell
      titleId="confirm-action-title"
      describedById="confirm-action-desc"
      title={title}
      subtitle="Confirmación requerida antes de aplicar el cambio."
      closeAriaLabel="Cerrar confirmación"
      tone={tone}
      role="alertdialog"
      initialFocusRef={cancelBtnRef}
      onRequestClose={onClose}
    >
      <div className={styles.formBody}>
        <div id="confirm-action-desc">
          <p className={styles.warningLead}>{description}</p>
          {impactDetail && <p className={styles.warningSub}>{impactDetail}</p>}
        </div>

        <div className={styles.modalFooter}>
          <button
            ref={cancelBtnRef}
            type="button"
            className={styles.secondaryBtn}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={
              tone === 'danger' ? styles.dangerBtn : styles.amberBtn
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
