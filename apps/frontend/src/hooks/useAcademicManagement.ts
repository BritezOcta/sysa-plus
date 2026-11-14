import { useMemo, useState } from 'react'
import {
  AUDIT_ACTION_TYPES,
  AUDIT_ENTITY_TYPES,
  CAREER_RULES,
  ENTITY_STATUS,
  ID_PREFIXES,
  SUBJECT_RULES,
  VIEW_MODES,
} from '../constants'
import {
  INITIAL_CAREERS,
  INITIAL_CORRELATIVITIES,
  INITIAL_SUBJECTS,
} from '../data/mockAcademicData'
import {
  AcademicFormatHelper,
  AcademicValidationHelper,
  CorrelativityGraphHelper,
  IdAndDateHelper,
} from '../helpers'
import type {
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
import { useAuditLog } from './useAuditLog'
import { useServerFaultSimulation } from './useServerFaultSimulation'
import { useToastNotifications } from './useToastNotifications'

export function useAcademicManagement() {
  // Datos de negocio mantenidos en memoria para un entorno 100% reproducible
  const [careers, setCareers] = useState<Career[]>(() => [...INITIAL_CAREERS])
  const [subjects, setSubjects] = useState<Subject[]>(() => [
    ...INITIAL_SUBJECTS,
  ])
  const [correlativities, setCorrelativities] = useState<Correlativity[]>(
    () => [...INITIAL_CORRELATIVITIES],
  )

  const [selectedCareerId, setSelectedCareerId] = useState<string>(
    () => INITIAL_CAREERS[0]?.id ?? CAREER_RULES.FALLBACK_CAREER_ID,
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

  const { toasts, pushToast, dismissToast } = useToastNotifications()
  const {
    auditLogs,
    auditDrawerOpen,
    unreadAuditCount,
    recordAudit,
    openAuditDrawer,
    closeAuditDrawer,
    resetAuditLogs,
  } = useAuditLog()
  const {
    simulateServerFault,
    setSimulateServerFault,
    pendingFailedOperation,
    runWithServerCheck,
    dismissFailedOperation,
  } = useServerFaultSimulation()

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
    runWithServerCheck(
      data.id
        ? `Actualizar carrera ${data.code}`
        : `Dar de alta carrera ${data.code}`,
      () => {
        if (data.id) {
          setCareers((prev) =>
            prev.map((c) =>
              c.id === data.id
                ? {
                    ...c,
                    code: data.code,
                    name: data.name,
                    studyPlan: data.studyPlan,
                    durationYears: data.durationYears,
                    status: data.status,
                    description: data.description,
                    updatedAt: IdAndDateHelper.currentIsoTimestamp(),
                  }
                : c,
            ),
          )
          recordAudit(
            AUDIT_ACTION_TYPES.EDICION,
            AUDIT_ENTITY_TYPES.CARRERA,
            `Editó carrera ${data.code} (${data.name})`,
            `Plan: ${data.studyPlan} · Duración: ${data.durationYears} años · Estado: ${AcademicFormatHelper.formatEntityStatus(data.status)}.`,
          )
          pushToast(
            'success',
            'Carrera actualizada',
            `Se guardaron los cambios en ${data.code} — ${data.name}.`,
          )
        } else {
          const newId = IdAndDateHelper.createId(ID_PREFIXES.CAREER)
          const newCareer: Career = {
            id: newId,
            code: data.code,
            name: data.name,
            studyPlan: data.studyPlan,
            durationYears: data.durationYears,
            status: data.status,
            description: data.description,
            updatedAt: IdAndDateHelper.currentIsoTimestamp(),
          }
          setCareers((prev) => [...prev, newCareer])
          setSelectedCareerId(newId)
          recordAudit(
            AUDIT_ACTION_TYPES.ALTA,
            AUDIT_ENTITY_TYPES.CARRERA,
            `Alta de nueva carrera ${data.code}`,
            `Se creó "${data.name}" (${data.studyPlan}) con duración de ${data.durationYears} años.`,
          )
          pushToast(
            'success',
            'Carrera dada de alta',
            `La carrera ${data.code} (${data.name}) ya está disponible en la oferta académica.`,
          )
        }
        closeCareerModal()
      },
    )
  }

  function handleToggleCareerStatus(career: Career) {
    const nextStatus = AcademicFormatHelper.getOppositeEntityStatus(
      career.status,
    )
    const statusLabel = AcademicFormatHelper.formatEntityStatus(nextStatus)

    runWithServerCheck(
      `${nextStatus === ENTITY_STATUS.INACTIVE ? 'Inactivar' : 'Activar'} carrera ${career.code}`,
      () => {
        setCareers((prev) =>
          prev.map((c) =>
            c.id === career.id
              ? {
                  ...c,
                  status: nextStatus,
                  updatedAt: IdAndDateHelper.currentIsoTimestamp(),
                }
              : c,
          ),
        )
        recordAudit(
          nextStatus === ENTITY_STATUS.INACTIVE
            ? AUDIT_ACTION_TYPES.INACTIVACION
            : AUDIT_ACTION_TYPES.EDICION,
          AUDIT_ENTITY_TYPES.CARRERA,
          `${
            nextStatus === ENTITY_STATUS.INACTIVE ? 'Inactivó' : 'Reactivó'
          } la carrera ${career.code}`,
          `La carrera "${career.name}" pasó a estado ${statusLabel}.`,
        )
        pushToast(
          nextStatus === ENTITY_STATUS.ACTIVE ? 'success' : 'warning',
          nextStatus === ENTITY_STATUS.ACTIVE
            ? 'Carrera reactivada'
            : 'Carrera inactivada',
          `${career.code} ahora se encuentra ${statusLabel}.`,
        )
      },
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
    const totalStudents =
      AcademicValidationHelper.getTotalEnrolledStudentsInCareer(
        career.id,
        subjects,
      )

    if (totalStudents > 0) {
      pushToast(
        'danger',
        'Baja de carrera bloqueada (2.5)',
        `${career.code} tiene ${totalStudents} alumnos cursando en sus materias. Se sugiere inactivarla.`,
      )
      return
    }

    const associatedCorrsCount = correlativities.filter(
      (c) => c.careerId === career.id,
    ).length

    setConfirmDialog({
      title: `Dar de baja la carrera ${career.code}`,
      description: `¿Confirmás la eliminación permanente de "${career.name}" (${career.studyPlan})?`,
      impactDetail: `Se eliminarán ${associatedSubjects.length} materia(s) y ${associatedCorrsCount} correlatividad(es) asociadas sin alumnos inscriptos.`,
      confirmLabel: `Eliminar carrera ${career.code}`,
      tone: 'danger',
      onConfirm: () => {
        setConfirmDialog(null)
        runWithServerCheck(`Dar de baja carrera ${career.code}`, () => {
          const remaining = careers.filter((c) => c.id !== career.id)
          setCareers(remaining)
          setSubjects((prev) => prev.filter((s) => s.careerId !== career.id))
          setCorrelativities((prev) =>
            prev.filter((c) => c.careerId !== career.id),
          )
          if (selectedCareerId === career.id && remaining[0]) {
            setSelectedCareerId(remaining[0].id)
          }
          recordAudit(
            AUDIT_ACTION_TYPES.BAJA,
            AUDIT_ENTITY_TYPES.CARRERA,
            `Baja definitiva de carrera ${career.code}`,
            `Se eliminó la carrera "${career.name}" sin alumnos activos.`,
          )
          pushToast(
            'info',
            'Carrera eliminada',
            `Se dio de baja la carrera ${career.code}.`,
          )
        })
      },
    })
  }

  function handleSaveSubject(
    subjectData: SubjectFormPayload,
    updatedRequirements: PendingRequirement[],
  ) {
    runWithServerCheck(
      subjectData.id
        ? `Guardar cambios en materia ${subjectData.code}`
        : `Dar de alta materia ${subjectData.code}`,
      () => {
        let targetSubjectId = subjectData.id
        const periodLabel = AcademicFormatHelper.formatPeriodLabel(
          subjectData.year,
          subjectData.period,
        )

        if (subjectData.id) {
          setSubjects((prev) =>
            prev.map((s) =>
              s.id === subjectData.id
                ? {
                    ...s,
                    careerId: subjectData.careerId,
                    code: subjectData.code,
                    name: subjectData.name,
                    weeklyHours: subjectData.weeklyHours,
                    totalHours: subjectData.totalHours,
                    year: subjectData.year,
                    period: subjectData.period,
                    status: subjectData.status,
                    enrolledStudents: subjectData.enrolledStudents,
                  }
                : s,
            ),
          )
          recordAudit(
            AUDIT_ACTION_TYPES.EDICION,
            AUDIT_ENTITY_TYPES.MATERIA,
            `Editó materia ${subjectData.code} (${subjectData.name})`,
            `Ubicación: ${periodLabel} · Carga: ${subjectData.weeklyHours}h/sem · Correlativas: ${updatedRequirements.length}.`,
          )
          pushToast(
            'success',
            'Materia actualizada',
            `${subjectData.code} (${subjectData.name}) y sus correlatividades fueron actualizadas.`,
          )
        } else {
          targetSubjectId = IdAndDateHelper.createId(ID_PREFIXES.SUBJECT)
          const newSubj: Subject = {
            id: targetSubjectId,
            careerId: subjectData.careerId,
            code: subjectData.code,
            name: subjectData.name,
            weeklyHours: subjectData.weeklyHours,
            totalHours: subjectData.totalHours,
            year: subjectData.year,
            period: subjectData.period,
            status: subjectData.status,
            enrolledStudents: subjectData.enrolledStudents,
          }
          setSubjects((prev) => [...prev, newSubj])
          recordAudit(
            AUDIT_ACTION_TYPES.ALTA,
            AUDIT_ENTITY_TYPES.MATERIA,
            `Alta de materia ${subjectData.code} (${subjectData.name})`,
            `Asociada a ${
              careers.find((c) => c.id === subjectData.careerId)?.code ?? ''
            } en ${periodLabel}.`,
          )
          pushToast(
            'success',
            'Materia dada de alta',
            `Se incorporó ${subjectData.code} — ${subjectData.name} al plan de estudios.`,
          )
        }

        if (targetSubjectId) {
          setCorrelativities((prev) => {
            const others = prev.filter((c) => c.subjectId !== targetSubjectId)
            const fresh: Correlativity[] = updatedRequirements.map(
              (req, idx) => ({
                id: `${IdAndDateHelper.createId(ID_PREFIXES.CORRELATIVITY)}-${idx}`,
                careerId: subjectData.careerId,
                subjectId: targetSubjectId!,
                requiresSubjectId: req.requiresSubjectId,
                type: req.type,
                createdAt: IdAndDateHelper.currentIsoTimestamp(),
              }),
            )
            return [...others, ...fresh]
          })
        }

        closeSubjectModal()
      },
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
    const originLabel = AcademicFormatHelper.formatPeriodLabel(
      subj.year,
      subj.period,
    )

    runWithServerCheck(`Reubicar ${subj.code} a ${destLabel}`, () => {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subjectId
            ? { ...s, year: targetYear, period: targetPeriod }
            : s,
        ),
      )
      recordAudit(
        AUDIT_ACTION_TYPES.REUBICACION,
        AUDIT_ENTITY_TYPES.MATERIA,
        `Movió ${subj.code} a ${destLabel}`,
        `La materia "${subj.name}" fue arrastrada desde ${originLabel} hacia ${destLabel}.`,
      )
      pushToast(
        'info',
        'Ubicación actualizada (Drag & Drop)',
        `${subj.code} (${subj.name}) ahora está en ${destLabel}.`,
      )
    })
  }

  function handleToggleSubjectStatus(subj: Subject) {
    const nextStatus = AcademicFormatHelper.getOppositeEntityStatus(subj.status)
    const statusLabel = AcademicFormatHelper.formatEntityStatus(nextStatus)

    runWithServerCheck(
      `${nextStatus === ENTITY_STATUS.INACTIVE ? 'Inactivar' : 'Reactivar'} materia ${subj.code}`,
      () => {
        setSubjects((prev) =>
          prev.map((s) =>
            s.id === subj.id ? { ...s, status: nextStatus } : s,
          ),
        )
        recordAudit(
          nextStatus === ENTITY_STATUS.INACTIVE
            ? AUDIT_ACTION_TYPES.INACTIVACION
            : AUDIT_ACTION_TYPES.EDICION,
          AUDIT_ENTITY_TYPES.MATERIA,
          `${
            nextStatus === ENTITY_STATUS.INACTIVE ? 'Inactivó' : 'Reactivó'
          } la materia ${subj.code}`,
          `"${subj.name}" pasó a estado ${statusLabel}.`,
        )
        pushToast(
          nextStatus === ENTITY_STATUS.ACTIVE ? 'success' : 'warning',
          nextStatus === ENTITY_STATUS.ACTIVE
            ? 'Materia reactivada'
            : 'Materia inactivada',
          `${subj.code} (${subj.name}) quedó en estado ${statusLabel}.`,
        )
      },
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
          ? `La materia no registra alumnos inscriptos. También se desvincularán ${linkedCorrsCount} correlatividad(es) conectadas a esta materia.`
          : 'La materia no registra alumnos cursando ni correlatividades activas.',
      confirmLabel: `Eliminar materia ${subj.code}`,
      tone: 'danger',
      onConfirm: () => {
        setConfirmDialog(null)
        runWithServerCheck(`Eliminar materia ${subj.code}`, () => {
          setSubjects((prev) => prev.filter((s) => s.id !== subj.id))
          setCorrelativities((prev) =>
            prev.filter(
              (c) =>
                c.subjectId !== subj.id && c.requiresSubjectId !== subj.id,
            ),
          )
          recordAudit(
            AUDIT_ACTION_TYPES.BAJA,
            AUDIT_ENTITY_TYPES.MATERIA,
            `Baja de materia ${subj.code} (${subj.name})`,
            `Materia eliminada físicamente (0 alumnos cursando/inscriptos).`,
          )
          pushToast(
            'info',
            'Materia dada de baja',
            `Se eliminó ${subj.code} — ${subj.name} del plan de estudios.`,
          )
        })
      },
    })
  }

  function handleInactivateBlockedSubject(subj: Subject) {
    setBlockedDeletionSubject(null)
    runWithServerCheck(`Inactivar preventivamente materia ${subj.code}`, () => {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subj.id ? { ...s, status: ENTITY_STATUS.INACTIVE } : s,
        ),
      )
      recordAudit(
        AUDIT_ACTION_TYPES.INACTIVACION,
        AUDIT_ENTITY_TYPES.MATERIA,
        `Inactivó ${subj.code} (baja bloqueada por ${subj.enrolledStudents} alumnos)`,
        `Se aplicó baja lógica sobre "${subj.name}" preservando los ${subj.enrolledStudents} alumnos inscriptos.`,
      )
      pushToast(
        'warning',
        'Materia inactivada en lugar de eliminada',
        `Se inactivó ${subj.code} preservando las inscripciones de sus ${subj.enrolledStudents} alumnos.`,
      )
    })
  }

  function handleConnectCorrelativity(
    requiresSubjectId: string,
    targetSubjectId: string,
    type: CorrelativityType,
  ) {
    const prereq = subjects.find((s) => s.id === requiresSubjectId)
    const target = subjects.find((s) => s.id === targetSubjectId)
    if (!prereq || !target) return

    const existing = correlativities.find(
      (c) =>
        c.subjectId === targetSubjectId &&
        c.requiresSubjectId === requiresSubjectId,
    )

    const typeMeta = AcademicFormatHelper.formatCorrelativityTypeLabel(type)

    if (existing) {
      if (existing.type === type) {
        pushToast(
          'info',
          'Correlatividad ya existente',
          `${target.code} ya requiere ${prereq.code} (${typeMeta.full}).`,
        )
        return
      }
      runWithServerCheck(
        `Cambiar condición de correlatividad ${prereq.code} ➔ ${target.code}`,
        () => {
          setCorrelativities((prev) =>
            prev.map((c) => (c.id === existing.id ? { ...c, type } : c)),
          )
          recordAudit(
            AUDIT_ACTION_TYPES.CORRELATIVIDAD,
            AUDIT_ENTITY_TYPES.CORRELATIVIDAD,
            `Actualizó correlatividad ${prereq.code} ➔ ${target.code}`,
            `Nueva condición: ${typeMeta.full}.`,
          )
          pushToast(
            'success',
            'Condición de correlatividad actualizada',
            `${prereq.code} ➔ ${target.code}: ${typeMeta.full}.`,
          )
        },
      )
      return
    }

    const cycleResult = CorrelativityGraphHelper.detectCircularDependency(
      correlativities,
      targetSubjectId,
      requiresSubjectId,
    )

    if (cycleResult.hasCycle) {
      setCircularConflictNodes(
        CorrelativityGraphHelper.mapCyclePathToNodes(
          cycleResult.cyclePath,
          subjects,
        ),
      )
      return
    }

    runWithServerCheck(
      `Crear correlatividad ${prereq.code} ➔ ${target.code}`,
      () => {
        const newCorr: Correlativity = {
          id: IdAndDateHelper.createId(ID_PREFIXES.CORRELATIVITY),
          careerId: target.careerId,
          subjectId: targetSubjectId,
          requiresSubjectId,
          type,
          createdAt: IdAndDateHelper.currentIsoTimestamp(),
        }
        setCorrelativities((prev) => [...prev, newCorr])
        recordAudit(
          AUDIT_ACTION_TYPES.CORRELATIVIDAD,
          AUDIT_ENTITY_TYPES.CORRELATIVIDAD,
          `Vinculó ${prereq.code} ➔ ${target.code} (${typeMeta.short})`,
          `Se definió que "${target.name}" requiere "${prereq.name}" en condición ${typeMeta.full}.`,
        )
        pushToast(
          'success',
          'Correlatividad vinculada',
          `${target.code} ahora requiere ${prereq.code} (${typeMeta.full}).`,
        )
      },
    )
  }

  function handleCycleCorrelativityType(correlativityId: string) {
    const corr = correlativities.find((c) => c.id === correlativityId)
    if (!corr) return

    const nextType = AcademicFormatHelper.getNextCorrelativityType(corr.type)
    const prereq = subjects.find((s) => s.id === corr.requiresSubjectId)
    const target = subjects.find((s) => s.id === corr.subjectId)

    runWithServerCheck(
      `Cambiar tipo de correlatividad ${prereq?.code} ➔ ${target?.code}`,
      () => {
        setCorrelativities((prev) =>
          prev.map((c) =>
            c.id === correlativityId ? { ...c, type: nextType } : c,
          ),
        )
        const meta = AcademicFormatHelper.formatCorrelativityTypeLabel(nextType)
        recordAudit(
          AUDIT_ACTION_TYPES.CORRELATIVIDAD,
          AUDIT_ENTITY_TYPES.CORRELATIVIDAD,
          `Cambió condición ${prereq?.code} ➔ ${target?.code} a ${meta.short}`,
          `Ahora exige ${meta.full}.`,
        )
        pushToast(
          'info',
          'Requisito modificado',
          `${prereq?.code} ➔ ${target?.code}: ${meta.full}.`,
        )
      },
    )
  }

  function handleRemoveCorrelativity(correlativityId: string) {
    const corr = correlativities.find((c) => c.id === correlativityId)
    if (!corr) return

    const prereq = subjects.find((s) => s.id === corr.requiresSubjectId)
    const target = subjects.find((s) => s.id === corr.subjectId)
    const meta = AcademicFormatHelper.formatCorrelativityTypeLabel(corr.type)

    setConfirmDialog({
      title: `Eliminar correlatividad ${prereq?.code ?? ''} ➔ ${target?.code ?? ''}`,
      description: `¿Confirmás quitar el requisito de "${prereq?.code ?? ''} — ${prereq?.name ?? ''}" sobre "${target?.code ?? ''} — ${target?.name ?? ''}"?`,
      impactDetail: `Condición actual: ${meta.full}.`,
      confirmLabel: 'Eliminar correlatividad',
      tone: 'danger',
      onConfirm: () => {
        setConfirmDialog(null)
        runWithServerCheck(
          `Eliminar correlatividad ${prereq?.code} ➔ ${target?.code}`,
          () => {
            setCorrelativities((prev) =>
              prev.filter((c) => c.id !== correlativityId),
            )
            recordAudit(
              AUDIT_ACTION_TYPES.BAJA,
              AUDIT_ENTITY_TYPES.CORRELATIVIDAD,
              `Eliminó correlatividad ${prereq?.code} ➔ ${target?.code}`,
              `Se quitó el requisito entre "${prereq?.name}" y "${target?.name}".`,
            )
            pushToast(
              'info',
              'Correlatividad eliminada',
              `Se desvinculó ${prereq?.code} de ${target?.code}.`,
            )
          },
        )
      },
    })
  }

  function handleResetMockData() {
    setConfirmDialog({
      title: 'Restaurar datos de prueba iniciales',
      description:
        '¿Querés restablecer las carreras, materias, correlatividades y el historial de auditoría a los valores iniciales de la UTN FRGP?',
      impactDetail:
        'Se descartarán todas las altas, bajas y modificaciones realizadas en la sesión en memoria.',
      confirmLabel: 'Restaurar datos iniciales',
      tone: 'warning',
      onConfirm: () => {
        setConfirmDialog(null)
        setCareers([...INITIAL_CAREERS])
        setSubjects([...INITIAL_SUBJECTS])
        setCorrelativities([...INITIAL_CORRELATIVITIES])
        resetAuditLogs()
        setSelectedCareerId(INITIAL_CAREERS[0].id)
        setSimulateServerFault(false)
        pushToast(
          'info',
          'Datos de prueba restaurados',
          'Se recargó en memoria la oferta académica inicial de la UTN FRGP.',
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
    openAuditDrawer,
    closeAuditDrawer,
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
