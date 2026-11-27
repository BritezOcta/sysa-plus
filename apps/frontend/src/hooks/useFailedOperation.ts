import { useCallback, useState } from 'react'
import type { PendingFailedOperation } from '../types'

/** Recovery for real network failures. Domain data always comes from the API. */
export function useFailedOperation() {
  const [pendingFailedOperation, setPendingFailedOperation] =
    useState<PendingFailedOperation | null>(null)
  const reportFailedOperation = useCallback((description: string, retry: () => void) => {
    setPendingFailedOperation({ description, retryFn: () => {
      setPendingFailedOperation(null)
      retry()
    } })
  }, [])
  return { pendingFailedOperation, reportFailedOperation, dismissFailedOperation: () => setPendingFailedOperation(null) }
}
