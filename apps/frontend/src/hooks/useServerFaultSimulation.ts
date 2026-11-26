import { useCallback, useState } from 'react'
import type { PendingFailedOperation } from '../types'

export function useServerFaultSimulation() {
  const [simulateServerFault, setSimulateServerFault] = useState(false)
  const [pendingFailedOperation, setPendingFailedOperation] =
    useState<PendingFailedOperation | null>(null)

  function runWithServerCheck(
    description: string,
    operation: () => void,
    bypassFault = false,
  ) {
    if (simulateServerFault && !bypassFault) {
      setPendingFailedOperation({
        description,
        retryFn: () => {
          setSimulateServerFault(false)
          setPendingFailedOperation(null)
          operation()
        },
      })
      return
    }
    operation()
  }

  function dismissFailedOperation() {
    setPendingFailedOperation(null)
  }

  /** Registra un fallo real de conexión para ofrecer "Reintentar" (RF-02 2.5). */
  const reportFailedOperation = useCallback(
    (description: string, retry: () => void) => {
      setPendingFailedOperation({
        description,
        retryFn: () => {
          setPendingFailedOperation(null)
          retry()
        },
      })
    },
    [],
  )

  return {
    simulateServerFault,
    setSimulateServerFault,
    pendingFailedOperation,
    runWithServerCheck,
    reportFailedOperation,
    dismissFailedOperation,
  }
}
