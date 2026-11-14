import { useRef, type ReactNode } from 'react'
import { handleDialogTrapKeyDown, useDialogFocusTrap } from '../../hooks'
import type { ModalHeaderTone } from '../../types'
import styles from '../academic/Modals.module.css'

interface ModalShellProps {
  titleId: string
  describedById?: string
  title: string
  subtitle: string
  closeAriaLabel: string
  tone?: ModalHeaderTone
  wide?: boolean
  role?: 'dialog' | 'alertdialog'
  canClose?: boolean
  initialFocusRef?: React.RefObject<HTMLElement | null>
  onRequestClose: () => void
  children: ReactNode
}

export default function ModalShell({
  titleId,
  describedById,
  title,
  subtitle,
  closeAriaLabel,
  tone = 'default',
  wide = false,
  role = 'dialog',
  canClose = true,
  initialFocusRef,
  onRequestClose,
  children,
}: ModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useDialogFocusTrap(dialogRef, initialFocusRef)

  const headerToneClass =
    tone === 'danger'
      ? styles.headerDanger
      : tone === 'warning'
        ? styles.headerWarning
        : ''

  return (
    <div
      className={styles.backdrop}
      onClick={() => {
        if (canClose) onRequestClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`${styles.modalCard} ${wide ? styles.modalCardWide : ''}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) =>
          handleDialogTrapKeyDown(
            e,
            dialogRef.current,
            onRequestClose,
            canClose,
          )
        }
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById}
      >
        <div className={`${styles.modalHeader} ${headerToneClass}`}>
          <div>
            <h2 id={titleId}>{title}</h2>
            <p className={styles.modalSubtitle}>{subtitle}</p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onRequestClose}
            disabled={!canClose}
            aria-label={closeAriaLabel}
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
