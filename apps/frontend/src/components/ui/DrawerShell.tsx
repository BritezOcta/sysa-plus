import { useRef, type ReactNode } from 'react'
import { handleDialogTrapKeyDown, useDialogFocusTrap } from '../../hooks'
import styles from '../academic/Modals.module.css'

interface DrawerShellProps {
  titleId: string
  title: string
  subtitle: string
  closeAriaLabel: string
  onClose: () => void
  children: ReactNode
}

export default function DrawerShell({
  titleId,
  title,
  subtitle,
  closeAriaLabel,
  onClose,
  children,
}: DrawerShellProps) {
  const drawerRef = useRef<HTMLElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useDialogFocusTrap(drawerRef, closeBtnRef)

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside
        ref={drawerRef}
        className={styles.drawerPanel}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) =>
          handleDialogTrapKeyDown(e, drawerRef.current, onClose)
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id={titleId}>{title}</h2>
            <p className={styles.modalSubtitle}>{subtitle}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={closeAriaLabel}
          >
            ✕
          </button>
        </div>

        {children}
      </aside>
    </div>
  )
}
