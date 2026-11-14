import { useRef } from 'react'
import type { CycleConflictNode } from '../../../types'
import ModalShell from '../../ui/ModalShell'
import styles from '../Modals.module.css'

interface CircularConflictModalProps {
  cycleNodes: CycleConflictNode[]
  onClose: () => void
}

export default function CircularConflictModal({
  cycleNodes,
  onClose,
}: CircularConflictModalProps) {
  const ackBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <ModalShell
      titleId="circular-conflict-title"
      describedById="circular-conflict-desc"
      title="Correlatividad circular detectada"
      subtitle="Validación de dependencias del plan de estudios"
      closeAriaLabel="Cerrar alerta de correlatividad circular"
      tone="danger"
      role="alertdialog"
      initialFocusRef={ackBtnRef}
      onRequestClose={onClose}
    >
      <div className={styles.formBody}>
        <p className={styles.warningLead} id="circular-conflict-desc">
          La operación fue <strong>rechazada</strong> porque genera una
          dependencia circular imposible de cumplir (una materia termina
          requiriéndose indirectamente a sí misma):
        </p>

        <div
          className={styles.cycleChainBox}
          aria-label="Cadena de materias en conflicto"
        >
          {cycleNodes.map((node, index) => {
            const isBoundaryNode =
              index === 0 || index === cycleNodes.length - 1
            return (
              <div key={`${node.code}-${index}`} className={styles.cycleStep}>
                <div
                  className={`${styles.cycleNodePill} ${
                    isBoundaryNode ? styles.cycleNodeConflict : ''
                  }`}
                >
                  <strong>{node.code}</strong>
                  <span>{node.name}</span>
                </div>
                {index < cycleNodes.length - 1 && (
                  <span className={styles.cycleArrow} aria-hidden="true">
                    ➔
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className={styles.modalFooter}>
          <button
            ref={ackBtnRef}
            type="button"
            className={styles.primaryBtn}
            onClick={onClose}
          >
            Entendido, revisar correlatividades
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
