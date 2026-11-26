import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, NetworkError } from '../api/httpClient'
import {
  teacherAssignmentApi,
  type AssignmentOptions,
  type AssignmentRole,
  type AssignedTeacher,
  type CommissionWithTeachers,
  type CommissionsResponse,
  type SubjectWithCommissions,
  type TeacherLoadResponse,
} from '../api/teacherAssignment.api'
import type { ConfirmDialogConfig } from '../types'
import { useServerFaultSimulation } from './useServerFaultSimulation'
import { useToastNotifications } from './useToastNotifications'

export type AssignmentView = 'commissions' | 'teachers'

export interface AssignModalState {
  subject: SubjectWithCommissions
  commission: CommissionWithTeachers
}

export interface AssignmentFilters {
  year: 'all' | number
  search: string
  onlyPending: boolean
}

const EMPTY_OPTIONS: AssignmentOptions = { careers: [], periods: [], defaultPeriodId: '', teachers: [] }

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Comisión sin titular: es lo que el administrador tiene que resolver primero. */
export function needsTitular(commission: CommissionWithTeachers): boolean {
  return commission.status !== 'CANCELADA' && !commission.teachers.some((t) => t.role === 'TITULAR')
}

/** RF-03: estado y acciones de la pantalla de asignación de docentes. */
export function useTeacherAssignment() {
  const [options, setOptions] = useState<AssignmentOptions>(EMPTY_OPTIONS)
  const [careerId, setCareerId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [data, setData] = useState<CommissionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AssignmentFilters>({ year: 'all', search: '', onlyPending: false })
  const [view, setView] = useState<AssignmentView>('commissions')
  const [assignModal, setAssignModal] = useState<AssignModalState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [teacherLoad, setTeacherLoad] = useState<TeacherLoadResponse | null>(null)

  const { toasts, pushToast, dismissToast } = useToastNotifications()
  const { pendingFailedOperation, reportFailedOperation, dismissFailedOperation } = useServerFaultSimulation()

  const loadOptions = useCallback(async () => {
    const opts = await teacherAssignmentApi.getOptions()
    setOptions(opts)
    setCareerId((prev) => prev || opts.careers.find((c) => c.isActive)?.id || opts.careers[0]?.id || '')
    setPeriodId((prev) => prev || opts.defaultPeriodId)
    return opts
  }, [])

  const loadCommissions = useCallback(async (career: string, period: string) => {
    if (!career || !period) {
      setData(null)
      return
    }
    setData(await teacherAssignmentApi.getCommissions(career, period))
  }, [])

  // Carga inicial de filtros (carreras, períodos, docentes).
  useEffect(() => {
    function run() {
      setIsLoading(true)
      loadOptions()
        .then((opts) => {
          if (opts.careers.length === 0 || opts.periods.length === 0) setIsLoading(false)
        })
        .catch((err: unknown) => {
          setIsLoading(false)
          if (err instanceof NetworkError) {
            reportFailedOperation('Cargar carreras, períodos y docentes', run)
            return
          }
          setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar los datos')
        })
    }
    run()
  }, [loadOptions, reportFailedOperation])

  // Cada cambio de carrera o período recarga las comisiones.
  useEffect(() => {
    if (!careerId || !periodId) return
    function run() {
      setIsLoading(true)
      setLoadError(null)
      loadCommissions(careerId, periodId)
        .catch((err: unknown) => {
          if (err instanceof NetworkError) {
            reportFailedOperation('Cargar las comisiones', run)
            return
          }
          setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar las comisiones')
        })
        .finally(() => setIsLoading(false))
    }
    run()
  }, [careerId, periodId, loadCommissions, reportFailedOperation])

  // Vista "Por docente": materias y comisiones a cargo del docente elegido.
  useEffect(() => {
    if (view !== 'teachers' || !selectedTeacherId) return
    function run() {
      teacherAssignmentApi
        .getTeacherLoad(selectedTeacherId)
        .then(setTeacherLoad)
        .catch((err: unknown) => {
          if (err instanceof NetworkError) {
            reportFailedOperation('Cargar las comisiones del docente', run)
            return
          }
          pushToast('danger', 'No se pudo cargar el docente', err instanceof Error ? err.message : 'Error inesperado')
        })
    }
    run()
  }, [view, selectedTeacherId, reportFailedOperation, pushToast])

  async function refresh() {
    await loadCommissions(careerId, periodId)
    if (selectedTeacherId) setTeacherLoad(await teacherAssignmentApi.getTeacherLoad(selectedTeacherId))
  }

  /**
   * Ejecuta una operación que modifica asignaciones. Un error de conexión ofrece "Reintentar";
   * un error de negocio se muestra con el mensaje del servidor.
   */
  function runMutation(description: string, task: () => Promise<void>, onBusinessError: (message: string) => void) {
    const execute = () => {
      setIsSaving(true)
      task()
        .catch((err: unknown) => {
          if (err instanceof NetworkError) {
            reportFailedOperation(description, execute)
            return
          }
          onBusinessError(err instanceof ApiError || err instanceof Error ? err.message : 'Error inesperado')
        })
        .finally(() => setIsSaving(false))
    }
    execute()
  }

  function openAssignModal(subject: SubjectWithCommissions, commission: CommissionWithTeachers) {
    setModalError(null)
    setAssignModal({ subject, commission })
  }

  function closeAssignModal() {
    setAssignModal(null)
    setModalError(null)
  }

  function handleAssign(teacherId: string, role: AssignmentRole) {
    if (!assignModal) return
    const { subject, commission } = assignModal
    const teacher = options.teachers.find((t) => t.id === teacherId)
    runMutation(
      `Asignar docente a ${subject.name} (${commission.code})`,
      async () => {
        const result = await teacherAssignmentApi.assign(commission.id, teacherId, role)
        await refresh()
        closeAssignModal()
        pushToast(
          'success',
          'Docente asignado',
          `${teacher?.fullName ?? 'El docente'} quedó como ${role === 'TITULAR' ? 'titular' : 'ayudante'} en ${subject.name}, comisión ${commission.code}.`,
        )
        for (const warning of result.warnings) pushToast('warning', 'Revisá el horario', warning)
      },
      (message) => setModalError(message),
    )
  }

  function handleChangeRole(subject: SubjectWithCommissions, commission: CommissionWithTeachers, teacher: AssignedTeacher) {
    const nextRole: AssignmentRole = teacher.role === 'TITULAR' ? 'AYUDANTE' : 'TITULAR'
    runMutation(
      `Cambiar rol de ${teacher.fullName}`,
      async () => {
        await teacherAssignmentApi.changeRole(teacher.assignmentId, nextRole)
        await refresh()
        pushToast(
          'info',
          'Rol actualizado',
          `${teacher.fullName} ahora es ${nextRole === 'TITULAR' ? 'titular' : 'ayudante'} en ${subject.name}, comisión ${commission.code}.`,
        )
      },
      (message) => pushToast('danger', 'No se pudo cambiar el rol', message),
    )
  }

  function handleRequestUnassign(subject: SubjectWithCommissions, commission: CommissionWithTeachers, teacher: AssignedTeacher) {
    setConfirmDialog({
      title: `Desasignar a ${teacher.fullName}`,
      description: `¿Confirmás quitar a ${teacher.fullName} (${teacher.role === 'TITULAR' ? 'titular' : 'ayudante'}) de ${subject.name}, comisión ${commission.code}?`,
      impactDetail:
        'El docente deja de ver esta comisión: no podrá cargar asistencias, notas ni consultar el listado de alumnos. Lo ya cargado se conserva.',
      confirmLabel: 'Desasignar docente',
      tone: 'danger',
      onConfirm: () => {
        setConfirmDialog(null)
        runMutation(
          `Desasignar a ${teacher.fullName}`,
          async () => {
            await teacherAssignmentApi.unassign(teacher.assignmentId)
            await refresh()
            pushToast('info', 'Docente desasignado', `${teacher.fullName} ya no está a cargo de ${subject.name} (${commission.code}).`)
          },
          (message) => pushToast('danger', 'No se pudo desasignar', message),
        )
      },
    })
  }

  /** Materias filtradas y agrupadas por año → anual / 1° cuat / 2° cuat. */
  const groupedSubjects = useMemo(() => {
    const term = normalize(filters.search.trim())
    const subjects = (data?.subjects ?? []).filter((s) => {
      if (filters.year !== 'all' && s.year !== filters.year) return false
      if (filters.onlyPending && !s.commissions.some(needsTitular) && s.commissions.length > 0) return false
      if (!term) return true
      return (
        normalize(`${s.code} ${s.name}`).includes(term) ||
        s.commissions.some(
          (c) => normalize(c.code).includes(term) || c.teachers.some((t) => normalize(t.fullName).includes(term)),
        )
      )
    })

    const years = new Map<number | null, { annual: SubjectWithCommissions[]; first: SubjectWithCommissions[]; second: SubjectWithCommissions[] }>()
    for (const s of subjects) {
      const group = years.get(s.year) ?? { annual: [], first: [], second: [] }
      if (s.period === 'anual') group.annual.push(s)
      else if (s.period === 2) group.second.push(s)
      else group.first.push(s)
      years.set(s.year, group)
    }
    return [...years.entries()].sort(([a], [b]) => (a ?? 99) - (b ?? 99))
  }, [data, filters])

  const stats = useMemo(() => {
    const commissions = (data?.subjects ?? []).flatMap((s) => s.commissions)
    return {
      commissions: commissions.length,
      withoutTeacher: commissions.filter((c) => c.status !== 'CANCELADA' && c.teachers.length === 0).length,
      withoutTitular: commissions.filter(needsTitular).length,
      subjectsWithoutCommission: (data?.subjects ?? []).filter((s) => s.isActive && s.commissions.length === 0).length,
    }
  }, [data])

  return {
    options,
    careerId,
    setCareerId,
    periodId,
    setPeriodId,
    data,
    isLoading,
    loadError,
    filters,
    setFilters,
    view,
    setView,
    groupedSubjects,
    stats,
    assignModal,
    openAssignModal,
    closeAssignModal,
    isSaving,
    modalError,
    handleAssign,
    handleChangeRole,
    handleRequestUnassign,
    confirmDialog,
    dismissConfirmDialog: () => setConfirmDialog(null),
    selectedTeacherId,
    setSelectedTeacherId,
    teacherLoad,
    pendingFailedOperation,
    dismissFailedOperation,
    toasts,
    dismissToast,
  }
}
