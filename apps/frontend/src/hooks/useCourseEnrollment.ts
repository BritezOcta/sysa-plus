import { useCallback, useEffect, useState } from 'react'
import { courseEnrollmentApi } from '../api/courseEnrollment.api'
import { ApiError, NetworkError } from '../api/httpClient'
import type {
  AvailableSubject,
  Commission,
  EnrollmentOverview,
  MissingRequirement,
  StudentEnrollment,
  ToastMessage,
} from '../types'

export interface EnrollmentModalState {
  title: string
  message: string
  isConfirmation?: boolean
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
}

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }

/** Títulos de los modales según el código de error que devuelve el backend. */
const ERROR_TITLES: Record<string, string> = {
  CORRELATIVITIES_NOT_MET: 'Correlatividades no cumplidas',
  STUDENT_INACTIVE: 'Alumno dado de baja o inactivo',
  COMMISSION_FULL: 'Cupo completo en la comisión',
  SCHEDULE_CONFLICT: 'Superposición de horarios',
  ENROLLMENT_PERIOD_CLOSED: 'Período de inscripción cerrado',
  ALREADY_ENROLLED: 'Ya estás inscripto',
  ALREADY_ENROLLED_IN_SUBJECT: 'Ya estás inscripto en esta materia',
  SUBJECT_ALREADY_COMPLETED: 'Materia ya cursada',
  OFFERING_NOT_AVAILABLE: 'Comisión no disponible',
  OFFERING_NOT_FOUND: 'Comisión no disponible',
  NO_ACTIVE_CAREER: 'Sin carrera activa',
  ENROLLMENT_NOT_FOUND: 'Inscripción inexistente',
  ENROLLMENT_NOT_ACTIVE: 'Inscripción no vigente',
  CONCURRENT_UPDATE: 'No se pudo completar la inscripción',
  UNAUTHENTICATED: 'Sesión expirada',
}

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.'

function describeMissing(missing: MissingRequirement[]): string {
  return missing
    .map((m) => `${m.subjectName} (${m.requiredCondition === 'APROBADA' ? 'aprobada' : 'regularizada'})`)
    .join(', ')
}

export function teachersLabel(teachers: string[]): string {
  // TODO(RF-03): cuando exista la asignación de profesores, toda comisión debería tener docente.
  return teachers.length > 0 ? teachers.join(', ') : 'A designar'
}

export function useCourseEnrollment() {
  const [overview, setOverview] = useState<EnrollmentOverview | null>(null)
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalState, setModalState] = useState<EnrollmentModalState | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const refresh = useCallback(
    () =>
      courseEnrollmentApi.getOverview().then(
        (data) => {
          setOverview(data)
          setLoadState({ status: 'ready' })
        },
        (error: unknown) => {
          setLoadState({
            status: 'error',
            message: error instanceof ApiError ? error.message : NETWORK_ERROR_MESSAGE,
          })
        },
      ),
    [],
  )

  // Carga inicial: el setState ocurre en el callback de la promesa, no en el cuerpo del efecto.
  useEffect(() => {
    let cancelled = false
    courseEnrollmentApi.getOverview().then(
      (data) => {
        if (cancelled) return
        setOverview(data)
        setLoadState({ status: 'ready' })
      },
      (error: unknown) => {
        if (cancelled) return
        setLoadState({
          status: 'error',
          message: error instanceof ApiError ? error.message : NETWORK_ERROR_MESSAGE,
        })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  function retryLoad() {
    setLoadState({ status: 'loading' })
    void refresh()
  }

  function pushToast(toast: Omit<ToastMessage, 'id'>) {
    setToasts((prev) => [...prev, { ...toast, id: `${Date.now()}-${Math.random()}` }])
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  /** Muestra el error de la API en un modal; los errores de red ofrecen reintentar. */
  function showRequestError(error: unknown, retry: () => void) {
    if (error instanceof ApiError) {
      setModalState({
        title: ERROR_TITLES[error.code] ?? 'No se pudo completar la operación',
        message: error.message,
      })
      // El rechazo puede deberse a datos desactualizados (cupo, período): se refresca la pantalla.
      void refresh()
      return
    }
    if (error instanceof NetworkError) {
      setModalState({
        title: 'Error de conexión con el servidor',
        message: NETWORK_ERROR_MESSAGE,
        isConfirmation: true,
        confirmLabel: 'Reintentar',
        onConfirm: retry,
      })
      return
    }
    setModalState({ title: 'Error inesperado', message: 'Ocurrió un error inesperado. Intentá nuevamente.' })
  }

  // -------------------------------------------------------------------------
  // Inscripción
  // -------------------------------------------------------------------------

  /**
   * Validaciones previas con los datos ya cargados, para avisar antes de confirmar.
   * El backend vuelve a validar todo (cupo y horarios incluidos) al confirmar.
   */
  function handleRequestEnroll(subject: AvailableSubject, commission: Commission) {
    if (!overview) return

    if (!overview.period?.isOpen) {
      setModalState({
        title: ERROR_TITLES.ENROLLMENT_PERIOD_CLOSED,
        message: 'La inscripción a cursadas no se encuentra habilitada en este momento.',
      })
      return
    }

    if (!overview.student.isActive) {
      setModalState({
        title: ERROR_TITLES.STUDENT_INACTIVE,
        message: 'Tu cuenta se encuentra dada de baja o inactiva, por lo que no podés inscribirte. Comunicate con la Dirección.',
      })
      return
    }

    if (subject.missingRequirements.length > 0) {
      setModalState({
        title: ERROR_TITLES.CORRELATIVITIES_NOT_MET,
        message: `No podés inscribirte a ${subject.subjectName}. Debés tener previamente: ${describeMissing(subject.missingRequirements)}.`,
      })
      return
    }

    setModalState({
      title: 'Confirmar inscripción a cursada',
      message: `¿Confirmás tu inscripción a ${subject.subjectName} en la comisión ${commission.name} (${commission.scheduleText}) con ${teachersLabel(commission.teachers)}?`,
      isConfirmation: true,
      confirmLabel: 'Confirmar inscripción',
      onConfirm: () => void executeEnrollment(subject, commission),
    })
  }

  async function executeEnrollment(subject: AvailableSubject, commission: Commission) {
    setIsSubmitting(true)
    try {
      const enrollment = await courseEnrollmentApi.enroll(commission.courseOfferingId)
      setModalState(null)
      pushToast({
        type: 'success',
        title: 'Inscripción exitosa',
        message: `${enrollment.subjectName} - Comisión ${enrollment.commission} (${enrollment.scheduleText}) - Docente: ${teachersLabel(enrollment.teachers)}`,
      })
      await refresh()
    } catch (error) {
      showRequestError(error, () => void executeEnrollment(subject, commission))
    } finally {
      setIsSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Cancelación
  // -------------------------------------------------------------------------

  function handleRequestCancel(enrollment: StudentEnrollment) {
    if (!overview?.period?.isOpen) {
      setModalState({
        title: ERROR_TITLES.ENROLLMENT_PERIOD_CLOSED,
        message: 'No podés cancelar la inscripción porque el período de inscripción ya cerró.',
      })
      return
    }

    setModalState({
      title: 'Cancelar inscripción',
      message: `¿Estás seguro de que querés cancelar tu inscripción a ${enrollment.subjectName} (Comisión ${enrollment.commission})? Si querés cambiar de comisión, después podés inscribirte en otra.`,
      isConfirmation: true,
      confirmLabel: 'Cancelar inscripción',
      cancelLabel: 'Volver',
      onConfirm: () => void executeCancel(enrollment),
    })
  }

  async function executeCancel(enrollment: StudentEnrollment) {
    setIsSubmitting(true)
    try {
      await courseEnrollmentApi.cancel(enrollment.courseEnrollmentId)
      setModalState(null)
      pushToast({
        type: 'info',
        title: 'Inscripción cancelada',
        message: `Se dio de baja tu inscripción en ${enrollment.subjectName} (Comisión ${enrollment.commission}).`,
      })
      await refresh()
    } catch (error) {
      showRequestError(error, () => void executeCancel(enrollment))
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    overview,
    loadState,
    retryLoad,
    isSubmitting,
    modalState,
    dismissModal: () => setModalState(null),
    toasts,
    dismissToast,
    handleRequestEnroll,
    handleRequestCancel,
  }
}
