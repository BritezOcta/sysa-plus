import { useCallback, useEffect, useState } from 'react'
import { academicStatusApi } from '../api/academicStatus.api'
import { ApiError } from '../api/httpClient'
import type { AcademicStatus } from '../types/academicStatus.types'

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.'

export type AcademicStatusState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: AcademicStatus }

/** RF-09: carga el estado académico y expone un reintento para los errores de conexión. */
export function useAcademicStatus() {
  const [state, setState] = useState<AcademicStatusState>({ status: 'loading' })

  const load = useCallback(
    () =>
      academicStatusApi.get().then(
        (data) => setState({ status: 'ready', data }),
        (error: unknown) =>
          setState({
            status: 'error',
            message: error instanceof ApiError ? error.message : NETWORK_ERROR_MESSAGE,
          }),
      ),
    [],
  )

  // Carga inicial: el setState ocurre en el callback de la promesa, no en el cuerpo del efecto.
  useEffect(() => {
    void load()
  }, [load])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    void load()
  }, [load])

  return { state, retry }
}
