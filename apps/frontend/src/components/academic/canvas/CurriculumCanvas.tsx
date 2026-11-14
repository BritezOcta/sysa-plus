import { useEffect, useMemo, useState } from 'react'
import {
  CORRELATIVITY_TYPES,
  INITIAL_SIMULATION_STATE,
  UI_STORAGE_KEYS,
} from '../../../constants'
import {
  CorrelativityGraphHelper,
  StorageHelper,
  StudentSimulationHelper,
} from '../../../helpers'
import { useCanvasDragAndPorts } from '../../../hooks'
import type {
  Career,
  Correlativity,
  CorrelativityType,
  StudentSimStatus,
  Subject,
  SubjectPeriod,
} from '../../../types'
import styles from '../CurriculumCanvas.module.css'
import AcademicYearColumn from './AcademicYearColumn'
import CanvasToolbar from './CanvasToolbar'
import CanvasUsageGuide from './CanvasUsageGuide'
import CorrelativityCableOverlay from './CorrelativityCableOverlay'
import SubjectBankColumn from './SubjectBankColumn'
import SubjectCanvasCard from './SubjectCanvasCard'

interface CurriculumCanvasProps {
  career: Career
  subjects: Subject[]
  correlativities: Correlativity[]
  simMode: boolean
  onToggleSimMode: () => void
  onMoveSubjectSlot: (
    subjectId: string,
    targetYear: number | null,
    targetPeriod: SubjectPeriod | null,
  ) => void
  onConnectCorrelativity: (
    requiresSubjectId: string,
    targetSubjectId: string,
    type: CorrelativityType,
  ) => void
  onCycleCorrelativityType: (correlativityId: string) => void
  onRemoveCorrelativity: (correlativityId: string) => void
  onEditSubject: (subject: Subject) => void
  onDeleteSubject: (subject: Subject) => void
  onToggleSubjectStatus: (subject: Subject) => void
  onCreateSubjectInSlot: (
    year: number | null,
    period: SubjectPeriod | null,
  ) => void
}

export default function CurriculumCanvas({
  career,
  subjects,
  correlativities,
  simMode,
  onToggleSimMode,
  onMoveSubjectSlot,
  onConnectCorrelativity,
  onCycleCorrelativityType,
  onRemoveCorrelativity,
  onEditSubject,
  onDeleteSubject,
  onToggleSubjectStatus,
  onCreateSubjectInSlot,
}: CurriculumCanvasProps) {
  const [showGuide, setShowGuide] = useState<boolean>(
    () =>
      !StorageHelper.hasVisitedFlag(
        UI_STORAGE_KEYS.CORRELATIVITY_GUIDE_VISITED,
      ),
  )

  useEffect(() => {
    StorageHelper.markVisitedFlag(UI_STORAGE_KEYS.CORRELATIVITY_GUIDE_VISITED)
  }, [])

  const [activeWireType, setActiveWireType] = useState<CorrelativityType>(
    CORRELATIVITY_TYPES.REGULAR_TO_ENROLL,
  )
  const [pinnedSubjectId, setPinnedSubjectId] = useState<string | null>(null)
  const [hoveredSubjectId, setHoveredSubjectId] = useState<string | null>(null)
  const [showAllCables, setShowAllCables] = useState<boolean>(true)
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [activeDropSlotKey, setActiveDropSlotKey] = useState<string | null>(
    null,
  )
  const [simState, setSimState] = useState<Record<string, StudentSimStatus>>(
    () => ({ ...INITIAL_SIMULATION_STATE }),
  )

  const {
    surfaceRef,
    viewportRef,
    stickyScrollRef,
    portPositions,
    scrollContentWidth,
    isNativeScrollbarOffscreen,
    cableDrag,
    liveHoverCycleCheck,
    handleViewportScroll,
    handleStickyScroll,
    startWireDrag,
    toggleStickyWireFromKeyboard,
    consumeSuppressedCardClick,
  } = useCanvasDragAndPorts({
    careerId: career.id,
    subjects,
    correlativities,
    simMode,
    showGuide,
    activeWireType,
    onConnectCorrelativity,
  })

  const effectiveFocusId =
    cableDrag?.sourceSubjectId ?? hoveredSubjectId ?? pinnedSubjectId

  const connectedChain = useMemo(
    () =>
      CorrelativityGraphHelper.getConnectedChain(
        effectiveFocusId,
        correlativities,
      ),
    [effectiveFocusId, correlativities],
  )

  const simEvaluation = useMemo(
    () =>
      StudentSimulationHelper.evaluateStudentSimulation(
        subjects,
        correlativities,
        simState,
      ),
    [subjects, correlativities, simState],
  )

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  )

  function handleCardClick(subj: Subject) {
    if (consumeSuppressedCardClick()) {
      return
    }
    if (simMode) {
      setSimState((prev) => ({
        ...prev,
        [subj.id]: StudentSimulationHelper.getNextSimulationStatus(
          prev[subj.id],
        ),
      }))
      return
    }
    setPinnedSubjectId((prev) => (prev === subj.id ? null : subj.id))
  }

  function handleDragStartCard(subjectId: string, e: React.DragEvent) {
    if (cableDrag || simMode) {
      e.preventDefault()
      return
    }
    setDraggedCardId(subjectId)
    e.dataTransfer.setData('text/plain', subjectId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEndCard() {
    setDraggedCardId(null)
    setActiveDropSlotKey(null)
  }

  function renderSubjectCard(subj: Subject) {
    return (
      <SubjectCanvasCard
        key={subj.id}
        subject={subj}
        correlativities={correlativities}
        effectiveFocusId={effectiveFocusId}
        pinnedSubjectId={pinnedSubjectId}
        connectedChain={connectedChain}
        simMode={simMode}
        simInfo={simEvaluation[subj.id]}
        isCableDragging={Boolean(cableDrag)}
        isCableSource={cableDrag?.sourceSubjectId === subj.id}
        hoveredCableTargetId={cableDrag?.hoveredTargetId ?? null}
        hasLiveCycleConflict={Boolean(liveHoverCycleCheck?.hasCycle)}
        onDragStartCard={handleDragStartCard}
        onDragEndCard={handleDragEndCard}
        onHoverSubject={setHoveredSubjectId}
        onCardClick={handleCardClick}
        onEditSubject={onEditSubject}
        onToggleSubjectStatus={onToggleSubjectStatus}
        onDeleteSubject={onDeleteSubject}
        onStartWireDrag={startWireDrag}
        onToggleKeyboardWire={toggleStickyWireFromKeyboard}
      />
    )
  }

  const unassignedSubjects = subjects.filter(
    (s) => s.year === null || s.period === null,
  )

  const yearsArray = Array.from(
    { length: career.durationYears },
    (_, i) => i + 1,
  )

  const pinnedSubject = pinnedSubjectId
    ? subjectMap.get(pinnedSubjectId)
    : undefined

  return (
    <div className={styles.canvasWrapper}>
      <CanvasToolbar
        simMode={simMode}
        activeWireType={activeWireType}
        pinnedSubject={pinnedSubject}
        showAllCables={showAllCables}
        showGuide={showGuide}
        onSelectWireType={setActiveWireType}
        onApproveFirstYear={() =>
          setSimState(
            StudentSimulationHelper.buildApprovedFirstYearState(subjects),
          )
        }
        onResetSimulation={() => setSimState({})}
        onClearPinnedSubject={() => setPinnedSubjectId(null)}
        onToggleShowAllCables={setShowAllCables}
        onToggleShowGuide={() => setShowGuide((prev) => !prev)}
        onToggleSimMode={onToggleSimMode}
      />

      {showGuide && (
        <CanvasUsageGuide onHideGuide={() => setShowGuide(false)} />
      )}

      <div
        ref={viewportRef}
        className={`${styles.boardViewport} ${
          isNativeScrollbarOffscreen ? styles.boardViewportStickyActive : ''
        }`}
        onScroll={handleViewportScroll}
      >
        <div
          ref={surfaceRef}
          className={styles.boardSurface}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPinnedSubjectId(null)
            }
          }}
        >
          <CorrelativityCableOverlay
            correlativities={correlativities}
            portPositions={portPositions}
            connectedChain={connectedChain}
            showAllCables={showAllCables}
            effectiveFocusId={effectiveFocusId}
            cableDrag={cableDrag}
            hasLiveCycleConflict={Boolean(liveHoverCycleCheck?.hasCycle)}
            activeWireType={activeWireType}
            simMode={simMode}
            subjectMap={subjectMap}
            onCycleCorrelativityType={onCycleCorrelativityType}
            onRemoveCorrelativity={onRemoveCorrelativity}
          />

          <SubjectBankColumn
            unassignedSubjects={unassignedSubjects}
            activeDropSlotKey={activeDropSlotKey}
            draggedCardId={draggedCardId}
            onSetActiveDropSlotKey={setActiveDropSlotKey}
            onMoveSubjectSlot={onMoveSubjectSlot}
            onCreateSubjectInSlot={onCreateSubjectInSlot}
            renderSubjectCard={renderSubjectCard}
          />

          {yearsArray.map((yr) => (
            <AcademicYearColumn
              key={yr}
              year={yr}
              subjects={subjects}
              activeDropSlotKey={activeDropSlotKey}
              draggedCardId={draggedCardId}
              onSetActiveDropSlotKey={setActiveDropSlotKey}
              onMoveSubjectSlot={onMoveSubjectSlot}
              onCreateSubjectInSlot={onCreateSubjectInSlot}
              renderSubjectCard={renderSubjectCard}
            />
          ))}
        </div>
      </div>

      {isNativeScrollbarOffscreen && (
        <div
          ref={stickyScrollRef}
          className={styles.stickyScrollbar}
          onScroll={handleStickyScroll}
          aria-label="Barra de desplazamiento horizontal del plan de estudios"
        >
          <div
            className={styles.stickyScrollbarInner}
            style={{ width: `${scrollContentWidth}px` }}
          />
        </div>
      )}
    </div>
  )
}
