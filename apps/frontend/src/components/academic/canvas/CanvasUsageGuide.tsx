import styles from '../CurriculumCanvas.module.css'

interface CanvasUsageGuideProps {
  onHideGuide: () => void
}

export default function CanvasUsageGuide({
  onHideGuide,
}: CanvasUsageGuideProps) {
  return (
    <div
      id="canvas-usage-guide"
      className={styles.instructionsStrip}
      role="region"
      aria-label="Instrucciones de uso de correlatividades"
    >
      <div className={styles.instructionsItems}>
        <span>
          <strong>Ubicación:</strong> Arrastrá tarjetas entre columnas o usá{' '}
          <code>✎</code> para editar la materia y sus correlatividades.
        </span>
        <span>
          <strong>Correlatividades con (+):</strong> Hacé un solo clic en{' '}
          <code>(+)</code>, mové el mouse sin mantener apretado y hacé clic en
          la materia destino (o mantené presionado y arrastrá).
        </span>
        <span>
          <strong>Inspección de cadena:</strong> Seleccioná una materia con clic
          o teclado para resaltar sus correlativas previas y posteriores.
        </span>
      </div>
      <button
        type="button"
        onClick={onHideGuide}
        className={styles.hideGuideBtn}
        aria-label="Ocultar guía de uso de correlatividades"
      >
        ✕ Ocultar guía
      </button>
    </div>
  )
}
