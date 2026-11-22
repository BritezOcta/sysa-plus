import {
  ENTITY_STATUS,
  STUDENT_SIM_STATUS,
  SUBJECT_PERIODS,
} from '../../../constants'
import type {
  ConnectedChain,
  Correlativity,
  Subject,
  SubjectSimulationEvaluation,
} from '../../../types'
import TrashIcon from '../../ui/TrashIcon'
import styles from '../CurriculumCanvas.module.css'

interface SubjectCanvasCardProps {
  subject: Subject
  correlativities: Correlativity[]
  effectiveFocusId: string | null
  pinnedSubjectId: string | null
  connectedChain: ConnectedChain
  simMode: boolean
  simInfo: SubjectSimulationEvaluation | undefined
  isCableDragging: boolean
  isCableSource: boolean
  hoveredCableTargetId: string | null
  hasLiveCycleConflict: boolean
  onDragStartCard: (subjectId: string, e: React.DragEvent) => void
  onDragEndCard: () => void
  onHoverSubject: (subjectId: string | null) => void
  onCardClick: (subject: Subject) => void
  onEditSubject: (subject: Subject) => void
  onToggleSubjectStatus: (subject: Subject) => void
  onDeleteSubject: (subject: Subject) => void
  onStartWireDrag: (e: React.PointerEvent, sourceSubjectId: string) => void
  onToggleKeyboardWire: (sourceSubjectId: string) => void
}

export default function SubjectCanvasCard({
  subject,
  correlativities,
  effectiveFocusId,
  pinnedSubjectId,
  connectedChain,
  simMode,
  simInfo,
  isCableDragging,
  isCableSource,
  hoveredCableTargetId,
  hasLiveCycleConflict,
  onDragStartCard,
  onDragEndCard,
  onHoverSubject,
  onCardClick,
  onEditSubject,
  onToggleSubjectStatus,
  onDeleteSubject,
  onStartWireDrag,
  onToggleKeyboardWire,
}: SubjectCanvasCardProps) {
  const isFocused = effectiveFocusId === subject.id
  const isDirectPrereq = connectedChain.directPrereqIds.has(subject.id)
  const isIndirectPrereq = connectedChain.indirectPrereqIds.has(subject.id)
  const isDirectUnlocked = connectedChain.directUnlockedIds.has(subject.id)
  const isIndirectUnlocked = connectedChain.indirectUnlockedIds.has(subject.id)

  const isInChain =
    isFocused ||
    isDirectPrereq ||
    isIndirectPrereq ||
    isDirectUnlocked ||
    isIndirectUnlocked

  const isDimmed =
    !simMode && Boolean(effectiveFocusId) && !isInChain && !isCableDragging

  const isHoverTarget = hoveredCableTargetId === subject.id
  const isHoverCycleConflict = isHoverTarget && hasLiveCycleConflict

  const reqsCount = correlativities.filter(
    (c) => c.subjectId === subject.id,
  ).length
  const unlocksCount = correlativities.filter(
    (c) => c.requiresSubjectId === subject.id,
  ).length

  const isPinned = pinnedSubjectId === subject.id
  const isActive = subject.status === ENTITY_STATUS.ACTIVE

  const cardButtonLabel = simMode
    ? `Alternar simulación de ${subject.code} ${subject.name} (estado actual: ${simInfo?.status ?? STUDENT_SIM_STATUS.PENDING})`
    : `${isPinned ? 'Quitar foco de' : 'Enfocar correlatividades de'} ${subject.code} — ${subject.name}`

  const cardClassNames = [
    styles.subjectCard,
    !isActive ? styles.cardInactive : '',
    isFocused ? styles.cardFocused : '',
    isDirectPrereq ? styles.cardPrereqDirect : '',
    isIndirectPrereq ? styles.cardPrereqIndirect : '',
    isDirectUnlocked ? styles.cardUnlockedDirect : '',
    isIndirectUnlocked ? styles.cardUnlockedIndirect : '',
    isDimmed ? styles.cardDimmed : '',
    isHoverTarget && !isHoverCycleConflict ? styles.cardDropTargetOk : '',
    isHoverCycleConflict ? styles.cardDropTargetCycle : '',
    simMode && simInfo ? styles[`simCard_${simInfo.status}`] : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      data-subject-card={subject.id}
      draggable={!isCableDragging && !simMode}
      onDragStart={(e) => onDragStartCard(subject.id, e)}
      onDragEnd={onDragEndCard}
      onMouseEnter={() => {
        if (!isCableDragging) onHoverSubject(subject.id)
      }}
      onMouseLeave={() => {
        if (!isCableDragging) onHoverSubject(null)
      }}
      className={cardClassNames}
    >
      <div
        data-port-in={subject.id}
        className={`${styles.portDot} ${styles.portIn}`}
        title="Puerto de entrada (recibe correlativas previas)"
        aria-hidden="true"
      />

      <div className={styles.cardTopRow}>
        <div className={styles.codeAndGrip}>
          {!simMode && (
            <span
              className={styles.gripHandle}
              title="Arrastrar materia para cambiar de ubicación"
              aria-hidden="true"
            >
              ⠿
            </span>
          )}
          <span className={styles.cardCode}>{subject.code}</span>
          {subject.period === SUBJECT_PERIODS.ANNUAL && (
            <span className={styles.anualTag}>Anual</span>
          )}
          {!isActive && <span className={styles.inactiveTag}>Inactiva</span>}
        </div>

        {!simMode && (
          <div className={styles.cardQuickBtns}>
            <button
              type="button"
              onClick={() => onEditSubject(subject)}
              title="Editar materia, ubicación y correlatividades"
              aria-label={`Editar materia ${subject.code} — ${subject.name}`}
              className={styles.iconActionBtn}
            >
              ✎
            </button>
            <button
              type="button"
              onClick={() => onToggleSubjectStatus(subject)}
              title={isActive ? 'Inactivar materia' : 'Activar materia'}
              aria-label={
                isActive
                  ? `Inactivar materia ${subject.code} — ${subject.name}`
                  : `Activar materia ${subject.code} — ${subject.name}`
              }
              className={styles.iconActionBtn}
            >
              {isActive ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              onClick={() => onDeleteSubject(subject)}
              title="Dar de baja materia"
              aria-label={`Dar de baja materia ${subject.code} — ${subject.name}`}
              className={`${styles.iconActionBtn} ${styles.iconDeleteBtn}`}
            >
              <TrashIcon size={13} />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className={styles.cardMainBtn}
        onClick={() => onCardClick(subject)}
        aria-pressed={
          simMode
            ? simInfo?.status !== STUDENT_SIM_STATUS.PENDING
            : isPinned
        }
        aria-label={cardButtonLabel}
      >
        <span className={styles.cardTitle}>{subject.name}</span>

        {!simMode && !isFocused && isInChain && (
          <div className={styles.chainRoleBanner}>
            {isDirectPrereq && '⬅ Correlativa directa requerida'}
            {isIndirectPrereq && '⬅ Correlativa indirecta previa'}
            {isDirectUnlocked && '➡ Habilita directamente'}
            {isIndirectUnlocked && '➡ Habilita en cadena posterior'}
          </div>
        )}

        {isHoverCycleConflict && (
          <div className={styles.cycleLiveWarning}>
            Bucle circular: hacé clic o soltá para ver el detalle del conflicto
          </div>
        )}

        {isHoverTarget && !isHoverCycleConflict && (
          <div className={styles.validDropWarning}>
            Hacé clic o soltá el cable para vincular correlatividad
          </div>
        )}

        {simMode && simInfo ? (
          <div className={styles.simCardBody}>
            <div className={styles.simStatusBadgeRow}>
              <span
                className={`${styles.simStatePill} ${
                  styles[`simPill_${simInfo.status}`]
                }`}
              >
                {simInfo.status === STUDENT_SIM_STATUS.PENDING &&
                  '○ Pendiente (alternar)'}
                {simInfo.status === STUDENT_SIM_STATUS.REGULAR &&
                  '◑ Regularizada (alternar)'}
                {simInfo.status === STUDENT_SIM_STATUS.APPROVED &&
                  '● Aprobada (alternar)'}
              </span>
            </div>

            {simInfo.status === STUDENT_SIM_STATUS.PENDING && (
              <div className={styles.simEligibilityBox}>
                {simInfo.canCursar ? (
                  <span className={styles.simUnlockedCursar}>
                    ✓ Habilitada para cursar
                    {simInfo.canRendir ? ' y rendir' : ''}
                  </span>
                ) : (
                  <span className={styles.simLockedCursar}>
                    Bloqueada para cursar (falta:{' '}
                    {simInfo.missingCursar
                      .map((m) => m.subject.code)
                      .join(', ')}
                    )
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.cardMetaFooter}>
            <span title="Carga horaria semanal y total">
              {subject.weeklyHours}h/sem ({subject.totalHours}h)
            </span>
            <span
              className={
                subject.enrolledStudents > 0
                  ? styles.studentsPillActive
                  : styles.studentsPillZero
              }
              title="Alumnos cursando o inscriptos"
            >
              {subject.enrolledStudents} al.
            </span>
            <span className={styles.linksCounter} title="Correlatividades">
              {reqsCount > 0 ? `⬅ ${reqsCount}` : 'Ingreso'}{' '}
              {unlocksCount > 0 ? `· ➡ ${unlocksCount}` : ''}
            </span>
          </div>
        )}
      </button>

      {!simMode && (
        <button
          type="button"
          data-port-out={subject.id}
          aria-pressed={isCableSource}
          onPointerDown={(e) => onStartWireDrag(e, subject.id)}
          onClick={(e) => {
            e.stopPropagation()
            if (e.detail === 0) {
              onToggleKeyboardWire(subject.id)
            }
          }}
          className={`${styles.portDot} ${styles.portOut} ${
            isCableSource ? styles.portOutActive : ''
          }`}
          title="Hacé clic para enganchar la flecha (sin mantener apretado) o mantené y arrastrá hacia otra materia"
          aria-label={`Conectar correlatividad desde ${subject.code} — ${subject.name}`}
        >
          <span className={styles.portPlus} aria-hidden="true">
            +
          </span>
        </button>
      )}
    </article>
  )
}
