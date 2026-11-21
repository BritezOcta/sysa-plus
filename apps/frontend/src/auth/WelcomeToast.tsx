import { useEffect } from 'react'
import ToastViewport from '../components/ui/ToastViewport'
import { ROLE_LABELS } from '../constants'
import { useAuth } from './AuthContext'

const WELCOME_DURATION_MS = 5000

/** Mensaje de bienvenida con nombre y rol, mostrado una vez después del login (RF-01). */
export function WelcomeToast() {
  const { user, welcomePending, acknowledgeWelcome } = useAuth()

  useEffect(() => {
    if (!welcomePending) return
    const timer = setTimeout(acknowledgeWelcome, WELCOME_DURATION_MS)
    return () => clearTimeout(timer)
  }, [welcomePending, acknowledgeWelcome])

  if (!welcomePending || !user) return null

  return (
    <ToastViewport
      toasts={[
        {
          id: 'welcome',
          type: 'success',
          title: `¡Bienvenido/a, ${user.firstName}!`,
          message: `Ingresaste como ${ROLE_LABELS[user.role]}.`,
        },
      ]}
      onDismiss={acknowledgeWelcome}
    />
  )
}
