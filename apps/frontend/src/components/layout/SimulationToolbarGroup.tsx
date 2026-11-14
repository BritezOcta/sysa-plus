import styles from '../../pages/AcademicManagementPage.module.css'

interface SimulationToolbarGroupProps {
  simulateServerFault: boolean
  onToggleServerFault: (enabled: boolean) => void
  onResetMockData: () => void
}

export default function SimulationToolbarGroup({
  simulateServerFault,
  onToggleServerFault,
  onResetMockData,
}: SimulationToolbarGroupProps) {
  return (
    <div
      className={styles.demoToolsGroup}
      role="group"
      aria-label="Herramientas de simulación del prototipo"
    >
      <span className={styles.demoGroupLabel}>Simulación:</span>
      <label
        className={`${styles.faultSimulatorToggle} ${
          simulateServerFault ? styles.faultActive : ''
        }`}
        title="Simula un error de conexión al guardar para probar la recuperación de transacciones pendientes"
      >
        <input
          type="checkbox"
          checked={simulateServerFault}
          onChange={(e) => onToggleServerFault(e.target.checked)}
        />
        <span>
          {simulateServerFault
            ? 'Fallo de conexión activo'
            : 'Simular fallo de conexión'}
        </span>
      </label>

      <button
        type="button"
        onClick={onResetMockData}
        className={styles.resetMockBtn}
        title="Restaurar los datos de prueba en memoria a su estado inicial"
      >
        ↺ Restaurar datos
      </button>
    </div>
  )
}
