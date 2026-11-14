import { useState } from 'react'
import { ID_PREFIXES, TOAST_CONFIG } from '../constants'
import { IdAndDateHelper } from '../helpers'
import type { ToastMessage, ToastTone } from '../types'

export function useToastNotifications() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  function pushToast(type: ToastTone, title: string, message: string) {
    const id = IdAndDateHelper.createId(ID_PREFIXES.TOAST)
    setToasts((prev) => [
      ...prev.slice(-TOAST_CONFIG.MAX_PREVIOUS_KEPT),
      { id, type, title, message },
    ])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, TOAST_CONFIG.DURATION_MS)
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }

  return {
    toasts,
    pushToast,
    dismissToast,
  }
}
