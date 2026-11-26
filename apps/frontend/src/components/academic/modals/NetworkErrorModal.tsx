import { useRef } from 'react'
import ModalShell from '../../ui/ModalShell'
import styles from '../Modals.module.css'

interface NetworkErrorModalProps {
  actionDescription: string
  onClose: () => void
  onRetry: () => void
}

export default function NetworkErrorModal({ actionDescription, onClose, onRetry }: NetworkErrorModalProps) {
  const retryBtnRef = useRef<HTMLButtonElement>(null)
  return (
    <ModalShell
      titleId="network-error-title"
      describedById="network-error-desc"
      title="No pudimos confirmar el resultado"
      subtitle="Consultá el estado actual antes de volver a guardar"
      closeAriaLabel="Cerrar aviso de conexión"
      tone="danger"
      role="alertdialog"
      initialFocusRef={retryBtnRef}
      onRequestClose={onClose}
    >
      <div className={styles.formBody}>
        <div className={styles.warningHero} id="network-error-desc">
          <div className={styles.dangerIconCircle} aria-hidden="true">!</div>
          <div>
            <p className={styles.warningLead}>Se interrumpió la conexión durante: <strong>{actionDescription}</strong>.</p>
            <p className={styles.warningSub}>
              El servidor puede haber guardado el cambio. Consultar el estado vuelve a cargar los datos sin repetir la operación.
            </p>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>Cerrar</button>
          <button ref={retryBtnRef} type="button" className={styles.primaryBtn} onClick={onRetry}>Consultar estado</button>
        </div>
      </div>
    </ModalShell>
  )
}
