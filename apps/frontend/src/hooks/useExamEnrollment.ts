import { useCallback, useEffect, useState } from 'react'
import { examEnrollmentApi } from '../api/examEnrollment.api'
import { ApiError, NetworkError } from '../api/httpClient'
import type { ExamCall, ExamEnrollmentOverview, StudentExamEnrollment, ToastMessage } from '../types'
import type { EnrollmentModalState } from './useCourseEnrollment'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }

/** Títulos de los modales según el código de error que devuelve el backend. */
const ERROR_TITLES: Record<string, string> = {
  CORRELATIVITIES_NOT_MET: 'Correlatividades no cumplidas',
  NOT_REGULAR: 'Materia no regularizada',
  REGULARITY_EXPIRED: 'Regularidad vencida',
  STUDENT_INACTIVE: 'Alumno dado de baja o inactivo',
  CALL_FULL: 'Mesa sin cupo',
  EXAM_PERIOD_CLOSED: 'Período de inscripción a exámenes cerrado',
  ALREADY_ENROLLED: 'Ya estás inscripto en esta mesa',
  ALREADY_ENROLLED_IN_SUBJECT: 'Ya estás inscripto en esta materia',
  SUBJECT_ALREADY_APPROVED: 'Materia aprobada',
  CALL_NOT_AVAILABLE: 'Mesa no disponible',
  CALL_NOT_FOUND: 'Mesa no disponible',
  NO_ACTIVE_CAREER: 'Sin carrera activa',
  ENROLLMENT_NOT_FOUND: 'Inscripción inexistente',
  ENROLLMENT_NOT_ACTIVE: 'Inscripción no vigente',
  CONCURRENT_UPDATE: 'No se pudo completar la inscripción',
  UNAUTHENTICATED: 'Sesión expirada',
}

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.'

/** "YYYY-MM-DD" → "DD/MM/YYYY" */
export function formatExamDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

/** Aula y docente pueden no estar definidos todavía. */
export function classroomLabel(classroom: string | null): string {
  return classroom ?? 'Aula a confirmar'
}

export function teacherLabel(teacher: string | null): string {
  return teacher ?? 'A designar'
}

function loadErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : NETWORK_ERROR_MESSAGE
}

/** RF-06: estado y acciones de la pantalla de inscripción a exámenes finales. */
export function useExamEnrollment() {
  const [overview, setOverview] = useState<ExamEnrollmentOverview | null>(null)
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalState, setModalState] = useState<EnrollmentModalState | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const refresh = useCallback(
    () =>
      examEnrollmentApi.getOverview().then(
        (data) => {
          setOverview(data)
          setLoadState({ status: 'ready' })
        },
        (error: unknown) => setLoadState({ status: 'error', message: loadErrorMessage(error) }),
      ),
    [],
  )

  // Carga inicial: el setState ocurre en el callback de la promesa, no en el cuerpo del efecto.
  useEffect(() => {
    let cancelled = false
    examEnrollmentApi.getOverview().then(
      (data) => {
        if (cancelled) return
        setOverview(data)
        setLoadState({ status: 'ready' })
      },
      (error: unknown) => {
        if (!cancelled) setLoadState({ status: 'error', message: loadErrorMessage(error) })
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

  /** Avisa antes de confirmar con los datos ya cargados; el backend vuelve a validar todo. */
  function handleRequestEnroll(call: ExamCall) {
    if (!overview) return

    if (!overview.session?.isOpen) {
      setModalState({
        title: ERROR_TITLES.EXAM_PERIOD_CLOSED,
        message: 'La inscripción a exámenes no se encuentra habilitada en este momento.',
      })
      return
    }

    if (!overview.student.isActive) {
      setModalState({
        title: ERROR_TITLES.STUDENT_INACTIVE,
        message: 'Tu cuenta se encuentra dada de baja o inactiva, por lo que no podés inscribirte a exámenes. Comunicate con la Dirección.',
      })
      return
    }

    if (call.ineligibility) {
      setModalState({ title: ERROR_TITLES[call.ineligibility.code], message: call.ineligibility.message })
      return
    }

    setModalState({
      title: 'Confirmar inscripción a examen final',
      message: `¿Confirmás tu inscripción al ${call.callNumber}° llamado de ${call.subjectName}, el ${formatExamDate(call.date)} a las ${call.time} hs (${classroomLabel(call.classroom)}, ${teacherLabel(call.teacher)})?`,
      isConfirmation: true,
      confirmLabel: 'Confirmar inscripción',
      onConfirm: () => void executeEnrollment(call),
    })
  }

  async function executeEnrollment(call: ExamCall) {
    setIsSubmitting(true)
    try {
      const e = await examEnrollmentApi.enroll(call.examCallId)
      setModalState(null)
      pushToast({
        type: 'success',
        title: `Inscripción confirmada · Código ${e.enrollmentCode}`,
        message: `${e.subjectName} - ${formatExamDate(e.date)} ${e.time} hs - ${classroomLabel(e.classroom)} - Profesor: ${teacherLabel(e.teacher)}`,
      })
      await refresh()
    } catch (error) {
      showRequestError(error, () => void executeEnrollment(call))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleRequestCancel(enrollment: StudentExamEnrollment) {
    if (!enrollment.canCancel) {
      setModalState({
        title: ERROR_TITLES.EXAM_PERIOD_CLOSED,
        message: 'No podés darte de baja de la mesa porque el período de inscripción ya cerró.',
      })
      return
    }

    setModalState({
      title: 'Darse de baja de la mesa',
      message: `¿Querés cancelar tu inscripción al final de ${enrollment.subjectName} del ${formatExamDate(enrollment.date)}?`,
      isConfirmation: true,
      confirmLabel: 'Darme de baja',
      cancelLabel: 'Volver',
      onConfirm: () => void executeCancel(enrollment),
    })
  }

  async function executeCancel(enrollment: StudentExamEnrollment) {
    setIsSubmitting(true)
    try {
      await examEnrollmentApi.cancel(enrollment.examEnrollmentId)
      setModalState(null)
      pushToast({
        type: 'info',
        title: 'Inscripción cancelada',
        message: `Te diste de baja de la mesa de ${enrollment.subjectName} del ${formatExamDate(enrollment.date)}.`,
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
