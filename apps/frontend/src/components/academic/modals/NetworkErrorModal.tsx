import { useEffect, useRef, useState } from 'react'
import {
  INSTITUTION_BRAND,
  NETWORK_SIMULATION_CONFIG,
} from '../../../constants'
import ModalShell from '../../ui/ModalShell'
import styles from '../Modals.module.css'

interface NetworkErrorModalProps {
  actionDescription: string
  onClose: () => void
  onRetry: () => void
}

export default function NetworkErrorModal({
  actionDescription,
  onClose,
  onRetry,
}: NetworkErrorModalProps) {
  const [retrying, setRetrying] = useState(false)
  const retryBtnRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  function handleRetryClick() {
    setRetrying(true)
    timerRef.current = window.setTimeout(() => {
      setRetrying(false)
      onRetry()
    }, NETWORK_SIMULATION_CONFIG.RETRY_DELAY_MS)
  }

  return (
    <ModalShell
      titleId="network-error-title"
      describedById="network-error-desc"
      title="Error de conexión con el servidor"
      subtitle="La operación quedó retenida y no se aplicaron cambios parciales"
      closeAriaLabel="Cerrar aviso de error de conexión"
      tone="danger"
      role="alertdialog"
      canClose={!retrying}
      initialFocusRef={retryBtnRef}
      onRequestClose={onClose}
    >
      <div className={styles.formBody}>
        <div className={styles.warningHero} id="network-error-desc">
          <div className={styles.dangerIconCircle} aria-hidden="true">
            !
          </div>
          <div>
            <p className={styles.warningLead}>
              No se pudo completar la operación en{' '}
              <strong>{INSTITUTION_BRAND.SYSTEM_NAME}</strong> debido a una
              interrupción de conexión.
            </p>
            <p className={styles.warningSub}>
              Operación pendiente: <code>{actionDescription}</code>. Podés
              presionar <strong>Reintentar ahora</strong> para restablecer la
              conexión y aplicar el cambio.
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onClose}
            disabled={retrying}
          >
            Cancelar
          </button>
          <button
            ref={retryBtnRef}
            type="button"
            className={styles.primaryBtn}
            onClick={handleRetryClick}
            disabled={retrying}
          >
            {retrying ? 'Reintentando operación…' : '↻ Reintentar ahora'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
