import styles from '../../pages/AcademicManagementPage.module.css'
import type { ToastMessage } from '../../types'

interface ToastCardProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

export default function ToastCard({ toast, onDismiss }: ToastCardProps) {
  return (
    <div
      className={`${styles.toastCard} ${styles[`toast_${toast.type}`]}`}
    >
      <div className={styles.toastHeader}>
        <strong>{toast.title}</strong>
        <button
          type="button"
          aria-label={`Cerrar notificación: ${toast.title}`}
          onClick={() => onDismiss(toast.id)}
        >
          ✕
        </button>
      </div>
      <p>{toast.message}</p>
    </div>
  )
}
