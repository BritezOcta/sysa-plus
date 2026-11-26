import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { academicApi } from '../api/academic.api'
import { ApiError, NetworkError } from '../api/httpClient'
import {
  CAREER_RULES,
  ENTITY_STATUS,
  SUBJECT_RULES,
  VIEW_MODES,
} from '../constants'
import {
  AcademicFormatHelper,
  CorrelativityGraphHelper,
} from '../helpers'
import type {
  AuditLogEntry,
  Career,
  CareerFormPayload,
  CareerModalState,
  ConfirmDialogConfig,
  Correlativity,
  CorrelativityType,
  CycleConflictNode,
  PendingRequirement,
  Subject,
  SubjectFormPayload,
  SubjectModalState,
  SubjectPeriod,
  ViewMode,
} from '../types'
import { useServerFaultSimulation } from './useServerFaultSimulation'
import { useToastNotifications } from './useToastNotifications'

/** Códigos del backend que indican que la materia no puede borrarse físicamente. */
const SUBJECT_DELETION_BLOCKED_CODES = new Set([
  'SUBJECT_HAS_ENROLLED_STUDENTS',
  'SUBJECT_HAS_OFFERINGS_OR_EXAMS',
])

export function useAcademicManagement() {
  const [careers, setCareers] = useState<Career[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [correlativities, setCorrelativities] = useState<Correlativity[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])

  const [selectedCareerId, setSelectedCareerId] = useState<string>(
    CAREER_RULES.FALLBACK_CAREER_ID,
  )
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.CANVAS)
  const [simMode, setSimMode] = useState<boolean>(false)

  const [careerModalState, setCareerModalState] = useState<CareerModalState>({
    open: false,
    careerToEdit: null,
  })

  const [subjectModalState, setSubjectModalState] = useState<SubjectModalState>(
    {
      open: false,
      subjectToEdit: null,
      defaultYear: SUBJECT_RULES.DEFAULT_YEAR,
      defaultPeriod: SUBJECT_RULES.DEFAULT_PERIOD,
    },
  )

  const [blockedDeletionSubject, setBlockedDeletionSubject] =
    useState<Subject | null>(null)
  const [circularConflictNodes, setCircularConflictNodes] = useState<
    CycleConflictNode[] | null
  >(null)
  const [confirmDialog, setConfirmDialog] =
    useState<ConfirmDialogConfig | null>(null)

  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)
  const [unreadAuditCount, setUnreadAuditCount] = useState(0)
  // Refs para que refreshFromBackend no cambie de identidad (y no dispare recargas)
  // cada vez que se abre/cierra el panel de auditoría.
  const auditDrawerOpenRef = useRef(false)
  const knownAuditIdsRef = useRef<Set<string> | null>(null)

  const { toasts, pushToast, dismissToast } = useToastNotifications()
  const {
    simulateServerFault,
    setSimulateServerFault,
    pendingFailedOperation,
    runWithServerCheck,
    reportFailedOperation,
    dismissFailedOperation,
  } = useServerFaultSimulation()

  const refreshFromBackend = useCallback(async (preferredCareerId?: string) => {
    const snap = await academicApi.getSnapshot()
    setCareers(snap.careers)
    setSubjects(snap.subjects)
    setCorrelativities(snap.correlativities)
    setAuditLogs(snap.auditLogs)

    const known = knownAuditIdsRef.current
    if (known && !auditDrawerOpenRef.current) {
      const newEntries = snap.auditLogs.filter((log) => !known.has(log.id)).length
      if (newEntries > 0) setUnreadAuditCount((c) => c + newEntries)
    }
    knownAuditIdsRef.current = new Set(snap.auditLogs.map((log) => log.id))

    setSelectedCareerId((prev) => {
      if (preferredCareerId && snap.careers.some((c) => c.id === preferredCareerId)) {
        return preferredCareerId
      }
      if (snap.careers.some((c) => c.id === prev)) return prev
      return snap.careers[0]?.id ?? CAREER_RULES.FALLBACK_CAREER_ID
    })
  }, [])

  useEffect(() => {
    function loadInitialData() {
      void refreshFromBackend().catch((err: unknown) => {
        if (err instanceof NetworkError) {
          reportFailedOperation('Cargar la oferta académica', loadInitialData)
          return
        }
        pushToast(
          'danger',
          'Error al cargar datos',
          err instanceof Error ? err.message : 'No se pudo cargar la oferta académica',
        )
      })
    }
    loadInitialData()
  }, [refreshFromBackend, reportFailedOperation, pushToast])

  function handleApiError(err: unknown, fallbackTitle: string) {
    if (err instanceof ApiError && err.code === 'CIRCULAR_CORRELATIVITY') {
      const cycleIds = Array.isArray(err.data.cycleIds)
        ? (err.data.cycleIds as string[])
        : []
      if (cycleIds.length > 0) {
        setCircularConflictNodes(
          CorrelativityGraphHelper.mapCyclePathToNodes(cycleIds, subjects),
        )
        return
      }
    }
    pushToast(
      'danger',
      fallbackTitle,
      err instanceof Error ? err.message : 'Error inesperado',
    )
  }

  /**
   * Ejecuta una operación contra el backend:
   * - respeta el simulador de caídas del prototipo,
   * - ante un error de conexión real ofrece "Reintentar" (RF-02 2.5),
   * - ante un error de negocio muestra el mensaje del servidor.
   * `onApiError` permite interceptar un error puntual; devuelve true si lo manejó.
   */
  function runRemote(
    description: string,
    task: () => Promise<void>,
    errorTitle: string,
    onApiError?: (err: ApiError) => boolean,
  ) {
    const execute = () => {
      void task().catch((err: unknown) => {
        if (err instanceof NetworkError) {
          reportFailedOperation(description, execute)
          return
        }
        if (err instanceof ApiError && onApiError?.(err)) return
        handleApiError(err, errorTitle)
      })
    }
    runWithServerCheck(description, execute)
  }

  const activeCareer = useMemo(
    () => careers.find((c) => c.id === selectedCareerId) ?? careers[0],
    [careers, selectedCareerId],
  )

  const careerSubjects = useMemo(
    () => subjects.filter((s) => s.careerId === activeCareer?.id),
    [subjects, activeCareer],
  )

  const careerCorrelativities = useMemo(
    () => correlativities.filter((c) => c.careerId === activeCareer?.id),
    [correlativities, activeCareer],
  )

  function openNewCareerModal() {
    setCareerModalState({ open: true, careerToEdit: null })
  }

  function openEditCareerModal(career: Career) {
    setCareerModalState({ open: true, careerToEdit: career })
  }

  function closeCareerModal() {
    setCareerModalState({ open: false, careerToEdit: null })
  }

  function openCreateSubjectModal(
    defaultYear: number | null = SUBJECT_RULES.DEFAULT_YEAR,
    defaultPeriod: SubjectPeriod | null = SUBJECT_RULES.DEFAULT_PERIOD,
  ) {
    setSubjectModalState({
      open: true,
      subjectToEdit: null,
      defaultYear,
      defaultPeriod,
    })
  }

  function openEditSubjectModal(subject: Subject) {
    setSubjectModalState({
      open: true,
      subjectToEdit: subject,
      defaultYear: subject.year,
      defaultPeriod: subject.period,
    })
  }

  function closeSubjectModal() {
    setSubjectModalState((prev) => ({ ...prev, open: false }))
  }

  function handleSaveCareer(data: CareerFormPayload) {
    runRemote(
      data.id
        ? `Actualizar carrera ${data.code}`
        : `Dar de alta carrera ${data.code}`,
      async () => {
        const res = await academicApi.saveCareer(data)
        await refreshFromBackend(res.id)
        closeCareerModal()
        pushToast(
          'success',
          data.id ? 'Carrera actualizada' : 'Carrera dada de alta',
          `Se guardaron los cambios en ${data.code} — ${data.name}.`,
        )
      },
      'No se pudo guardar la carrera',
    )
  }

  function handleToggleCareerStatus(career: Career) {
    const nextStatus = AcademicFormatHelper.getOppositeEntityStatus(
      career.status,
    )
    const statusLabel = AcademicFormatHelper.formatEntityStatus(nextStatus)

    runRemote(
      `${nextStatus === ENTITY_STATUS.INACTIVE ? 'Inactivar' : 'Activar'} carrera ${career.code}`,
      async () => {
        await academicApi.toggleCareerStatus(career.id)
        await refreshFromBackend(career.id)
        pushToast(
          nextStatus === ENTITY_STATUS.ACTIVE ? 'success' : 'warning',
          nextStatus === ENTITY_STATUS.ACTIVE
            ? 'Carrera reactivada'
            : 'Carrera inactivada',
          `${career.code} ahora se encuentra ${statusLabel}.`,
        )
      },
      'No se pudo cambiar el estado de la carrera',
    )
  }

  function handleDeleteCareer(career: Career) {
    if (careers.length <= CAREER_RULES.MIN_SYSTEM_CAREERS) {
      pushToast(
        'warning',
        'Operación no permitida',
        'Debe existir al menos una carrera en el sistema.',
      )
      return
    }

    const associatedSubjects = subjects.filter((s) => s.careerId === career.id)
    const associatedCorrsCount = correlativities.filter(
      (c) => c.careerId === career.id,
    ).length

    setConfirmDialog({
      title: `Dar de baja la carrera ${career.code}`,
      description: `¿Confirmás la eliminación permanente de "${career.name}" (${career.studyPlan})?`,
      impactDetail: `Se eliminarán ${associatedSubjects.length} materia(s) y ${associatedCorrsCount} correlatividad(es) asociadas si no hay alumnos inscriptos.`,
      confirmLabel: `Eliminar carrera ${career.code}`,
      tone: 'danger',
      onConfirm: () => {
        setConfirmDialog(null)
        runRemote(
          `Dar de baja carrera ${career.code}`,
          async () => {
            await academicApi.deleteCareer(career.id)
            await refreshFromBackend()
            pushToast(
              'info',
              'Carrera eliminada',
              `Se dio de baja la carrera ${career.code}.`,
            )
          },
          'Baja de carrera bloqueada',
        )
      },
    })
  }

  function handleSaveSubject(
    subjectData: SubjectFormPayload,
    updatedRequirements: PendingRequirement[],
  ) {
    runRemote(
      subjectData.id
        ? `Guardar cambios en materia ${subjectData.code}`
        : `Dar de alta materia ${subjectData.code}`,
      async () => {
        await academicApi.saveSubject(subjectData, updatedRequirements)
        await refreshFromBackend(subjectData.careerId)
        closeSubjectModal()
        pushToast(
          'success',
          subjectData.id ? 'Materia actualizada' : 'Materia dada de alta',
          `${subjectData.code} (${subjectData.name}) fue guardada en el plan de estudios.`,
        )
      },
      'No se pudo guardar la materia',
    )
  }

  function handleMoveSubjectSlot(
    subjectId: string,
    targetYear: number | null,
    targetPeriod: SubjectPeriod | null,
  ) {
    const subj = subjects.find((s) => s.id === subjectId)
    if (!subj) return
    if (subj.year === targetYear && subj.period === targetPeriod) return

    const destLabel = AcademicFormatHelper.formatPeriodLabel(
      targetYear,
      targetPeriod,
    )

    runRemote(
      `Reubicar ${subj.code} a ${destLabel}`,
      async () => {
        await academicApi.moveSubjectSlot(subjectId, targetYear, targetPeriod)
        await refreshFromBackend(subj.careerId)
        pushToast(
          'info',
          'Ubicación actualizada',
          `${subj.code} (${subj.name}) ahora está en ${destLabel}.`,
        )
      },
      'No se pudo reubicar la materia',
    )
  }

  function setSubjectStatus(
    subj: Subject,
    nextStatus: Subject['status'],
    description: string,
    errorTitle: string,
  ) {
    const statusLabel = AcademicFormatHelper.formatEntityStatus(nextStatus)
    runRemote(
      description,
      async () => {
        await academicApi.toggleSubjectStatus(subj.id, nextStatus)
        await refreshFromBackend(subj.careerId)
        pushToast(
          nextStatus === ENTITY_STATUS.ACTIVE ? 'success' : 'warning',
          nextStatus === ENTITY_STATUS.ACTIVE
            ? 'Materia reactivada'
            : 'Materia inactivada',
          `${subj.code} (${subj.name}) quedó en estado ${statusLabel}.`,
        )
      },
      errorTitle,
    )
  }

  function handleToggleSubjectStatus(subj: Subject) {
    const nextStatus = AcademicFormatHelper.getOppositeEntityStatus(subj.status)
    setSubjectStatus(
      subj,
      nextStatus,
      `${nextStatus === ENTITY_STATUS.INACTIVE ? 'Inactivar' : 'Reactivar'} materia ${subj.code}`,
      'No se pudo cambiar el estado de la materia',
    )
  }

  function handleRequestDeleteSubject(subj: Subject) {
    if (subj.enrolledStudents > 0) {
      setBlockedDeletionSubject(subj)
      return
    }

    const linkedCorrsCount = correlativities.filter(
      (c) => c.subjectId === subj.id || c.requiresSubjectId === subj.id,
    ).length

    setConfirmDialog({
      title: `Dar de baja la materia ${subj.code}`,
      description: `¿Confirmás la baja física de "${subj.code} — ${subj.name}" del plan de estudios?`,
      impactDetail:
        linkedCorrsCount > 0
          ? `También se desvincularán ${linkedCorrsCount} correlatividad(es) conectadas a esta materia.`
          : 'Sin correlatividades activas vinculadas.',
      confirmLabel: `Eliminar materia ${subj.code}`,
      tone: 'danger',
      onConfirm: () => {
        setConfirmDialog(null)
        runRemote(
          `Eliminar materia ${subj.code}`,
          async () => {
            await academicApi.deleteSubject(subj.id)
            await refreshFromBackend(subj.careerId)
            pushToast(
              'info',
              'Materia dada de baja',
              `Se eliminó ${subj.code} — ${subj.name} del plan de estudios.`,
            )
          },
          'No se pudo eliminar la materia',
          (err) => {
            if (!SUBJECT_DELETION_BLOCKED_CODES.has(err.code)) return false
            setBlockedDeletionSubject(subj)
            return true
          },
        )
      },
    })
  }

  function handleInactivateBlockedSubject(subj: Subject) {
    setBlockedDeletionSubject(null)

    if (subj.status === ENTITY_STATUS.INACTIVE) {
      pushToast(
        'info',
        'Materia ya inactiva',
        `${subj.code} (${subj.name}) ya se encuentra en estado Inactiva.`,
      )
      return
    }

    setSubjectStatus(
      subj,
      ENTITY_STATUS.INACTIVE,
      `Inactivar materia ${subj.code}`,
      'No se pudo inactivar la materia',
    )
  }

  function handleConnectCorrelativity(
    requiresSubjectId: string,
    targetSubjectId: string,
    type: CorrelativityType,
  ) {
    const prereq = subjects.find((s) => s.id === requiresSubjectId)
    const target = subjects.find((s) => s.id === targetSubjectId)
    if (!prereq || !target) return

    runRemote(
      `Vincular correlatividad ${prereq.code} ➔ ${target.code}`,
      async () => {
        await academicApi.connectCorrelativity(
          requiresSubjectId,
          targetSubjectId,
          type,
        )
        await refreshFromBackend(target.careerId)
        const typeMeta = AcademicFormatHelper.formatCorrelativityTypeLabel(type)
        pushToast(
          'success',
          'Correlatividad vinculada',
          `${target.code} requiere ${prereq.code} (${typeMeta.full}).`,
        )
      },
      'No se pudo vincular la correlatividad',
    )
  }

  function handleCycleCorrelativityType(correlativityId: string) {
    const corr = correlativities.find((c) => c.id === correlativityId)
    if (!corr) return

    const nextType = AcademicFormatHelper.getNextCorrelativityType(corr.type)
    runRemote(
      'Cambiar condición de correlatividad',
      async () => {
        await academicApi.updateCorrelativityType(correlativityId, nextType)
        await refreshFromBackend(corr.careerId)
        const meta = AcademicFormatHelper.formatCorrelativityTypeLabel(nextType)
        pushToast('info', 'Requisito modificado', `Condición: ${meta.full}.`)
      },
      'No se pudo actualizar la correlatividad',
    )
  }

  function handleRemoveCorrelativity(correlativityId: string) {
    const corr = correlativities.find((c) => c.id === correlativityId)
    if (!corr) return

    const prereq = subjects.find((s) => s.id === corr.requiresSubjectId)
    const target = subjects.find((s) => s.id === corr.subjectId)

    setConfirmDialog({
      title: `Eliminar correlatividad ${prereq?.code ?? ''} ➔ ${target?.code ?? ''}`,
      description: `¿Confirmás quitar el requisito entre "${prereq?.code ?? ''}" y "${target?.code ?? ''}"?`,
      confirmLabel: 'Eliminar correlatividad',
      tone: 'danger',
      onConfirm: () => {
        setConfirmDialog(null)
        runRemote(
          'Eliminar correlatividad',
          async () => {
            await academicApi.removeCorrelativity(correlativityId)
            await refreshFromBackend(corr.careerId)
            pushToast('info', 'Correlatividad eliminada', 'Se quitó el requisito.')
          },
          'No se pudo eliminar la correlatividad',
        )
      },
    })
  }

  function handleResetMockData() {
    setConfirmDialog({
      title: 'Recargar datos desde el servidor',
      description:
        '¿Querés volver a consultar el estado actual de carreras, materias, correlatividades y auditoría desde la base de datos?',
      confirmLabel: 'Recargar desde BD',
      tone: 'warning',
      onConfirm: () => {
        setConfirmDialog(null)
        setSimulateServerFault(false)
        runRemote(
          'Recargar datos desde el servidor',
          async () => {
            await refreshFromBackend()
            pushToast('info', 'Sincronizado', 'Datos recargados desde la base.')
          },
          'No se pudieron recargar los datos',
        )
      },
    })
  }

  return {
    careers,
    subjects,
    correlativities,
    activeCareer,
    careerSubjects,
    careerCorrelativities,
    selectedCareerId,
    setSelectedCareerId,
    viewMode,
    setViewMode,
    simMode,
    toggleSimMode: () => setSimMode((prev) => !prev),
    careerModalState,
    openNewCareerModal,
    openEditCareerModal,
    closeCareerModal,
    subjectModalState,
    openCreateSubjectModal,
    openEditSubjectModal,
    closeSubjectModal,
    blockedDeletionSubject,
    dismissBlockedDeletionSubject: () => setBlockedDeletionSubject(null),
    circularConflictNodes,
    dismissCircularConflictNodes: () => setCircularConflictNodes(null),
    confirmDialog,
    dismissConfirmDialog: () => setConfirmDialog(null),
    auditLogs,
    auditDrawerOpen,
    unreadAuditCount,
    openAuditDrawer: () => {
      auditDrawerOpenRef.current = true
      setAuditDrawerOpen(true)
      setUnreadAuditCount(0)
    },
    closeAuditDrawer: () => {
      auditDrawerOpenRef.current = false
      setAuditDrawerOpen(false)
    },
    simulateServerFault,
    setSimulateServerFault,
    pendingFailedOperation,
    dismissFailedOperation,
    toasts,
    dismissToast,
    handleSaveCareer,
    handleToggleCareerStatus,
    handleDeleteCareer,
    handleSaveSubject,
    handleMoveSubjectSlot,
    handleToggleSubjectStatus,
    handleRequestDeleteSubject,
    handleInactivateBlockedSubject,
    handleConnectCorrelativity,
    handleCycleCorrelativityType,
    handleRemoveCorrelativity,
    handleResetMockData,
  }
}
