import styles from '../academic/Modals.module.css'

interface UnsavedChangesBannerProps {
  message?: string
  onKeepEditing: () => void
  onDiscard: () => void
}

export default function UnsavedChangesBanner({
  message = 'Tenés cambios sin guardar en este formulario. ¿Querés descartarlos?',
  onKeepEditing,
  onDiscard,
}: UnsavedChangesBannerProps) {
  return (
    <div className={styles.unsavedBar} role="alert">
      <p>{message}</p>
      <div className={styles.unsavedActions}>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={onKeepEditing}
        >
          Seguir editando
        </button>
        <button
          type="button"
          className={styles.dangerBtn}
          onClick={onDiscard}
        >
          Descartar cambios
        </button>
      </div>
    </div>
  )
}
