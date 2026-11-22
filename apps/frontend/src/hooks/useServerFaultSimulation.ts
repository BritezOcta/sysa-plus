import { useState } from 'react'
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

  return {
    simulateServerFault,
    setSimulateServerFault,
    pendingFailedOperation,
    runWithServerCheck,
    dismissFailedOperation,
  }
}
