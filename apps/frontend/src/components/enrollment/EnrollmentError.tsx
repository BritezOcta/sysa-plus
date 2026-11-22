import styles from "./EnrollmentError.module.css";

interface EnrollmentModalProps {
  title: string;
  message: string;
  isConfirmation?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

export default function EnrollmentErrorModal({
  title,
  message,
  isConfirmation = false,
  onClose,
  onConfirm,
}: EnrollmentModalProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={isConfirmation ? styles.titleConfirm : styles.title}>
          {title}
        </h3>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          {isConfirmation ? (
            <>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={onConfirm}
              >
                Confirmar Inscripción
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
