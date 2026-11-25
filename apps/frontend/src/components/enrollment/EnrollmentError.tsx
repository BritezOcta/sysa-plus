import styles from "./EnrollmentError.module.css";

interface EnrollmentModalProps {
  title: string;
  message: string;
  isConfirmation?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Deshabilita los botones mientras se procesa la confirmación. */
  busy?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

export default function EnrollmentErrorModal({
  title,
  message,
  isConfirmation = false,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  busy = false,
  onClose,
  onConfirm,
}: EnrollmentModalProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="enrollment-modal-title">
        <h3
          id="enrollment-modal-title"
          className={isConfirmation ? styles.titleConfirm : styles.title}
        >
          {title}
        </h3>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          {isConfirmation ? (
            <>
              <button
                type="button"
                className={styles.cancelBtn}
                disabled={busy}
                onClick={onClose}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                disabled={busy}
                onClick={onConfirm}
              >
                {busy ? "Procesando..." : confirmLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={onClose}
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
