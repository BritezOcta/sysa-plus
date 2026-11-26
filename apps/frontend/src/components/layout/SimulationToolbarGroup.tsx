import styles from '../../pages/AcademicManagementPage.module.css'

interface SimulationToolbarGroupProps {
  simulateServerFault: boolean
  onToggleServerFault: (enabled: boolean) => void
  onResetMockData: () => void
  resetButtonLabel?: string
}

export default function SimulationToolbarGroup({
  simulateServerFault,
  onToggleServerFault,
  onResetMockData,
  resetButtonLabel = 'Recargar datos',
}: SimulationToolbarGroupProps) {
  return (
    <div className={styles.demoToolsGroup}>
      <span className={styles.demoGroupLabel}>Herramientas</span>

      <label
        className={`${styles.faultSimulatorToggle} ${
          simulateServerFault ? styles.faultActive : ''
        }`}
      >
        <input
          type="checkbox"
          checked={simulateServerFault}
          onChange={(e) => onToggleServerFault(e.target.checked)}
        />
        Simular caída
      </label>

      <button
        type="button"
        className={styles.resetMockBtn}
        onClick={onResetMockData}
      >
        {resetButtonLabel}
      </button>
    </div>
  )
}
