import styles from '../../pages/AcademicManagementPage.module.css'
import type { ToastMessage } from '../../types'
import ToastCard from './ToastCard'

interface ToastViewportProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export default function ToastViewport({
  toasts,
  onDismiss,
}: ToastViewportProps) {
  return (
    <div className={styles.toastViewport} aria-live="polite">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
