import { useState, type ReactNode } from 'react'
import type {
  CallStatus,
  CommissionInput,
  CommissionRow,
  CommissionStatus,
  DateRange,
  ExamCallInput,
  ExamCallRow,
  ExamSessionRow,
  PeriodRow,
  PlanSubject,
  ScheduleSlotInput,
} from '../../api/adminCalendar.api'
import adminStyles from '../admin/AdminPages.module.css'
import modalStyles from '../academic/Modals.module.css'
import ModalShell from '../ui/ModalShell'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

interface FormModalProps {
  id: string
  title: string
  subtitle: string
  saving: boolean
  error: string | null
  submitLabel: string
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
}

function FormModal({ id, title, subtitle, saving, error, submitLabel, onClose, onSubmit, children }: FormModalProps) {
  return (
    <ModalShell titleId={id} title={title} subtitle={subtitle} closeAriaLabel="Cerrar" canClose={!saving} onRequestClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <div className={modalStyles.formBody}>
          {error && <div className={modalStyles.errorBanner} role="alert">{error}</div>}
          {children}
          <div className={modalStyles.modalFooter}>
            <button type="button" className={modalStyles.secondaryBtn} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className={modalStyles.primaryBtn} disabled={saving}>{saving ? 'Guardando…' : submitLabel}</button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className={modalStyles.field}>
      <span>{label}</span>
      {children}
      {hint && <span className={modalStyles.hint}>{hint}</span>}
    </label>
  )
}

interface CommonProps {
  saving: boolean
  error: string | null
  onClose: () => void
}

/** Fechas de cursada/turno y ventana de inscripción (la ventana se puede extender editándola). */
function DateRangeFields({ value, onChange, startLabel, endLabel }: { value: DateRange; onChange: (v: DateRange) => void; startLabel: string; endLabel: string }) {
  const set = (key: keyof DateRange) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [key]: e.target.value })
  return (
    <div className={adminStyles.formGrid}>
      <Field label={startLabel}><input type="date" required value={value.startDate} onChange={set('startDate')} /></Field>
      <Field label={endLabel}><input type="date" required value={value.endDate} onChange={set('endDate')} /></Field>
      <Field label="Inscripción desde"><input type="date" required value={value.enrollmentStartDate} onChange={set('enrollmentStartDate')} /></Field>
      <Field label="Inscripción hasta" hint="Para extender la inscripción, mové esta fecha."><input type="date" required value={value.enrollmentEndDate} onChange={set('enrollmentEndDate')} /></Field>
    </div>
  )
}

const emptyRange: DateRange = { startDate: '', endDate: '', enrollmentStartDate: '', enrollmentEndDate: '' }

// ---------------------------------------------------------------------------

export function PeriodModal({ period, onSave, ...common }: CommonProps & { period: PeriodRow | null; onSave: (body: DateRange & { year?: number; semester?: number }) => void }) {
  const [range, setRange] = useState<DateRange>(period ? { startDate: period.startDate, endDate: period.endDate, enrollmentStartDate: period.enrollmentStartDate ?? '', enrollmentEndDate: period.enrollmentEndDate ?? '' } : emptyRange)
  const [year, setYear] = useState(String(new Date().getFullYear() + 1))
  const [semester, setSemester] = useState('1')
  return (
    <FormModal
      id="period-modal"
      title={period ? `Editar ${period.label}` : 'Nuevo cuatrimestre'}
      subtitle="Fechas de cursada y ventana de inscripción a cursadas"
      submitLabel={period ? 'Guardar cambios' : 'Crear cuatrimestre'}
      onSubmit={() => onSave(period ? range : { ...range, year: Number(year), semester: Number(semester) })}
      {...common}
    >
      {!period && (
        <div className={adminStyles.formGrid}>
          <Field label="Año"><input type="number" min={2000} max={2100} required value={year} onChange={(e) => setYear(e.target.value)} /></Field>
          <Field label="Cuatrimestre">
            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="1">1° cuatrimestre</option>
              <option value="2">2° cuatrimestre</option>
            </select>
          </Field>
        </div>
      )}
      <DateRangeFields value={range} onChange={setRange} startLabel="Inicio de cursada" endLabel="Fin de cursada" />
    </FormModal>
  )
}

export function SessionModal({ session, onSave, ...common }: CommonProps & { session: ExamSessionRow | null; onSave: (body: DateRange & { name: string; status: CallStatus }) => void }) {
  const [range, setRange] = useState<DateRange>(session ? { startDate: session.startDate, endDate: session.endDate, enrollmentStartDate: session.enrollmentStartDate ?? '', enrollmentEndDate: session.enrollmentEndDate ?? '' } : emptyRange)
  const [name, setName] = useState(session?.name ?? '')
  const [status, setStatus] = useState<CallStatus>(session?.status ?? 'ABIERTA')
  return (
    <FormModal
      id="session-modal"
      title={session ? `Editar ${session.name}` : 'Nuevo turno de examen'}
      subtitle="Fechas del turno y ventana de inscripción a las mesas"
      submitLabel={session ? 'Guardar cambios' : 'Crear turno'}
      onSubmit={() => onSave({ ...range, name, status })}
      {...common}
    >
      <div className={adminStyles.formGrid}>
        <Field label="Nombre del turno"><input required maxLength={100} placeholder="Ej.: Turno Diciembre 2026" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Estado">
          <select value={status} onChange={(e) => setStatus(e.target.value as CallStatus)}>
            <option value="ABIERTA">Abierto</option>
            <option value="CERRADA">Cerrado</option>
          </select>
        </Field>
      </div>
      <DateRangeFields value={range} onChange={setRange} startLabel="Inicio del turno" endLabel="Fin del turno" />
    </FormModal>
  )
}

/** Sugerencia de código: toma la última comisión de la materia y suma 1 al número final ("2CN111" → "2CN112"). */
function suggestCode(subjectId: string, existing: CommissionRow[]): string {
  const codes = existing.filter((c) => c.subjectId === subjectId).map((c) => c.code).sort()
  const last = codes.at(-1)
  if (!last) return ''
  const match = /^(.*?)(\d+)$/.exec(last)
  if (!match) return `${last}-2`
  let n = Number(match[2]) + 1
  let candidate = `${match[1]}${String(n).padStart(match[2]!.length, '0')}`
  while (codes.includes(candidate)) candidate = `${match[1]}${String(++n).padStart(match[2]!.length, '0')}`
  return candidate
}

export function CommissionModal({
  commission,
  subjects,
  existing,
  defaultSubjectId,
  onSave,
  ...common
}: CommonProps & { commission: CommissionRow | null; subjects: PlanSubject[]; existing: CommissionRow[]; defaultSubjectId?: string; onSave: (body: CommissionInput) => void }) {
  const initialSubject = commission?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? ''
  const [subjectId, setSubjectId] = useState(initialSubject)
  const [code, setCode] = useState(commission?.code ?? suggestCode(initialSubject, existing))
  const [capacity, setCapacity] = useState(String(commission?.capacity ?? 40))
  const [status, setStatus] = useState<CommissionStatus>((commission?.status as CommissionStatus) ?? 'ABIERTA')
  const [slots, setSlots] = useState<ScheduleSlotInput[]>(
    commission?.schedule.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })) ?? [{ dayOfWeek: 1, startTime: '18:30', endTime: '22:30' }],
  )
  const setSlot = (i: number, patch: Partial<ScheduleSlotInput>) => setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  return (
    <FormModal
      id="commission-modal"
      title={commission ? `Editar comisión ${commission.code}` : 'Nueva comisión'}
      subtitle={commission ? `${commission.subjectCode} — ${commission.subjectName}` : 'Se suma a la oferta del cuatrimestre con su cupo y horarios'}
      submitLabel={commission ? 'Guardar cambios' : 'Crear comisión'}
      onSubmit={() => onSave({ subjectId, code: code.trim(), capacity: Number(capacity), status, schedule: slots })}
      {...common}
    >
      <div className={adminStyles.formGrid}>
        <Field label="Materia">
          <select
            value={subjectId}
            disabled={!!commission}
            onChange={(e) => {
              setSubjectId(e.target.value)
              setCode(suggestCode(e.target.value, existing))
            }}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.year ? `${s.year}° año · ` : ''}{s.code} — {s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Código de comisión" hint="Formato FRGP, ej.: 2CN111 (se sugiere el siguiente).">
          <input required maxLength={20} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        </Field>
        <Field label="Cupo" hint={commission ? `Inscriptos actuales: ${commission.enrolled}` : undefined}>
          <input type="number" min={commission?.enrolled || 1} max={1000} required value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </Field>
        <Field label="Estado">
          <select value={status} onChange={(e) => setStatus(e.target.value as CommissionStatus)}>
            <option value="ABIERTA">Abierta (acepta inscripciones)</option>
            <option value="CERRADA">Cerrada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </Field>
      </div>

      <div className={modalStyles.field}>
        <span>Horarios</span>
        {slots.map((slot, i) => (
          <div key={i} className={adminStyles.slotRow}>
            <select aria-label={`Día del horario ${i + 1}`} value={slot.dayOfWeek} onChange={(e) => setSlot(i, { dayOfWeek: Number(e.target.value) })}>
              {DAYS.map((d, idx) => <option key={d} value={idx + 1}>{d}</option>)}
            </select>
            <input type="time" aria-label={`Inicio del horario ${i + 1}`} required value={slot.startTime} onChange={(e) => setSlot(i, { startTime: e.target.value })} />
            <input type="time" aria-label={`Fin del horario ${i + 1}`} required value={slot.endTime} onChange={(e) => setSlot(i, { endTime: e.target.value })} />
            <button type="button" className={adminStyles.dangerAction} onClick={() => setSlots((prev) => prev.filter((_, j) => j !== i))} aria-label={`Quitar horario ${i + 1}`}>Quitar</button>
          </div>
        ))}
        <button type="button" className={adminStyles.secondaryAction} style={{ alignSelf: 'flex-start' }} onClick={() => setSlots((prev) => [...prev, { dayOfWeek: 1, startTime: '18:30', endTime: '22:30' }])}>
          + Agregar día
        </button>
      </div>
    </FormModal>
  )
}

export function ExamCallModal({
  call,
  subjects,
  teachers,
  onSave,
  ...common
}: CommonProps & { call: ExamCallRow | null; subjects: PlanSubject[]; teachers: { id: string; fullName: string }[]; onSave: (body: ExamCallInput) => void }) {
  const [subjectId, setSubjectId] = useState(call?.subjectId ?? subjects[0]?.id ?? '')
  const [date, setDate] = useState(call?.date ?? '')
  const [time, setTime] = useState(call?.time ?? '18:00')
  const [classroom, setClassroom] = useState(call?.classroom ?? '')
  const [capacity, setCapacity] = useState(call?.capacity ? String(call.capacity) : '')
  const [teacherId, setTeacherId] = useState(call?.teacher?.id ?? '')
  const [status, setStatus] = useState<CallStatus>(call?.status ?? 'ABIERTA')

  return (
    <FormModal
      id="exam-call-modal"
      title={call ? 'Editar mesa de examen' : 'Nueva mesa de examen'}
      subtitle={call ? `${call.subjectCode} — ${call.subjectName}` : 'Los alumnos eligen la mesa dentro de la ventana de inscripción del turno'}
      submitLabel={call ? 'Guardar cambios' : 'Crear mesa'}
      onSubmit={() => onSave({ subjectId, date, time, classroom, capacity: capacity ? Number(capacity) : null, teacherId: teacherId || null, status })}
      {...common}
    >
      <div className={adminStyles.formGrid}>
        <Field label="Materia">
          <select value={subjectId} disabled={!!call} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.year ? `${s.year}° año · ` : ''}{s.code} — {s.name}</option>)}
          </select>
        </Field>
        <Field label="Docente a cargo">
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">A designar</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>
        </Field>
        <Field label="Fecha"><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Field label="Aula"><input maxLength={50} placeholder="A confirmar" value={classroom} onChange={(e) => setClassroom(e.target.value)} /></Field>
        <Field label="Cupo" hint={call ? `Inscriptos actuales: ${call.enrolled}` : 'Vacío = sin límite'}>
          <input type="number" min={1} max={1000} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </Field>
        <Field label="Estado">
          <select value={status} onChange={(e) => setStatus(e.target.value as CallStatus)}>
            <option value="ABIERTA">Abierta (acepta inscripciones)</option>
            <option value="CERRADA">Cerrada</option>
          </select>
        </Field>
      </div>
    </FormModal>
  )
}
