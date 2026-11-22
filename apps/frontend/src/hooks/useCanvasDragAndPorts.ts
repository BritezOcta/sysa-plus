import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { KEYBOARD_KEYS, SCROLL_METRICS_THRESHOLDS } from '../constants'
import { CanvasGeometryHelper, CorrelativityGraphHelper } from '../helpers'
import type {
  CableDragState,
  Correlativity,
  CorrelativityType,
  PortCoords,
  Subject,
} from '../types'

interface UseCanvasDragAndPortsParams {
  careerId: string
  subjects: Subject[]
  correlativities: Correlativity[]
  simMode: boolean
  showGuide: boolean
  activeWireType: CorrelativityType
  onConnectCorrelativity: (
    requiresSubjectId: string,
    targetSubjectId: string,
    type: CorrelativityType,
  ) => void
}

export function useCanvasDragAndPorts({
  careerId,
  subjects,
  correlativities,
  simMode,
  showGuide,
  activeWireType,
  onConnectCorrelativity,
}: UseCanvasDragAndPortsParams) {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const stickyScrollRef = useRef<HTMLDivElement | null>(null)
  const isSyncingScrollRef = useRef(false)
  const suppressNextCardClickRef = useRef(false)

  const [portPositions, setPortPositions] = useState<
    Record<string, PortCoords>
  >({})
  const [scrollContentWidth, setScrollContentWidth] = useState<number>(0)
  const [isNativeScrollbarOffscreen, setIsNativeScrollbarOffscreen] =
    useState<boolean>(false)
  const [cableDrag, setCableDrag] = useState<CableDragState | null>(null)

  const updateScrollMetrics = useCallback(() => {
    const surface = surfaceRef.current
    const viewport = viewportRef.current
    if (!surface || !viewport) return

    setScrollContentWidth(surface.scrollWidth)
    setIsNativeScrollbarOffscreen(
      CanvasGeometryHelper.isNativeScrollbarOffscreen(surface, viewport),
    )
  }, [])

  const measurePorts = useCallback(() => {
    const surface = surfaceRef.current
    if (!surface) return

    setPortPositions(CanvasGeometryHelper.measureAllCardPorts(surface))
    updateScrollMetrics()
  }, [updateScrollMetrics])

  useLayoutEffect(() => {
    measurePorts()
  }, [measurePorts, subjects, correlativities, careerId, simMode, showGuide])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return

    const resizeObserver = new ResizeObserver(() => {
      measurePorts()
    })
    resizeObserver.observe(surface)

    window.addEventListener('resize', measurePorts)
    window.addEventListener('scroll', updateScrollMetrics, { passive: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', measurePorts)
      window.removeEventListener('scroll', updateScrollMetrics)
    }
  }, [measurePorts, updateScrollMetrics])

  useEffect(() => {
    if (
      isNativeScrollbarOffscreen &&
      stickyScrollRef.current &&
      viewportRef.current
    ) {
      stickyScrollRef.current.scrollLeft = viewportRef.current.scrollLeft
    }
  }, [isNativeScrollbarOffscreen, scrollContentWidth])

  function handleViewportScroll() {
    measurePorts()
    if (isSyncingScrollRef.current) return

    const viewport = viewportRef.current
    const sticky = stickyScrollRef.current
    if (viewport && sticky && sticky.scrollLeft !== viewport.scrollLeft) {
      isSyncingScrollRef.current = true
      sticky.scrollLeft = viewport.scrollLeft
      requestAnimationFrame(() => {
        isSyncingScrollRef.current = false
      })
    }
  }

  function handleStickyScroll() {
    if (isSyncingScrollRef.current) return

    const viewport = viewportRef.current
    const sticky = stickyScrollRef.current
    if (viewport && sticky && viewport.scrollLeft !== sticky.scrollLeft) {
      isSyncingScrollRef.current = true
      viewport.scrollLeft = sticky.scrollLeft
      measurePorts()
      requestAnimationFrame(() => {
        isSyncingScrollRef.current = false
      })
    }
  }

  useEffect(() => {
    if (!cableDrag) return

    function handlePointerMove(event: PointerEvent) {
      const surface = surfaceRef.current
      if (!surface) return

      const rect = surface.getBoundingClientRect()
      const currentX = event.clientX - rect.left
      const currentY = event.clientY - rect.top
      const targetId = CanvasGeometryHelper.findSubjectIdAtPoint(
        event.clientX,
        event.clientY,
      )

      setCableDrag((prev) =>
        prev
          ? {
              ...prev,
              currentX,
              currentY,
              hoveredTargetId:
                targetId && targetId !== prev.sourceSubjectId ? targetId : null,
            }
          : null,
      )
    }

    function handlePointerDown(event: PointerEvent) {
      if (!cableDrag?.isStickyClickMode) return

      const targetId = CanvasGeometryHelper.findSubjectIdAtPoint(
        event.clientX,
        event.clientY,
      )

      suppressNextCardClickRef.current = true
      window.setTimeout(() => {
        suppressNextCardClickRef.current = false
      }, 0)

      if (targetId && targetId !== cableDrag.sourceSubjectId) {
        onConnectCorrelativity(
          cableDrag.sourceSubjectId,
          targetId,
          activeWireType,
        )
      }
      setCableDrag(null)
    }

    function handlePointerUp(event: PointerEvent) {
      if (!cableDrag || cableDrag.isStickyClickMode) return

      const surface = surfaceRef.current
      const rect = surface?.getBoundingClientRect()
      const endX = rect ? event.clientX - rect.left : cableDrag.currentX
      const endY = rect ? event.clientY - rect.top : cableDrag.currentY
      const dragDistance = Math.hypot(
        endX - cableDrag.startX,
        endY - cableDrag.startY,
      )

      const targetId = CanvasGeometryHelper.findSubjectIdAtPoint(
        event.clientX,
        event.clientY,
      )

      if (targetId && targetId !== cableDrag.sourceSubjectId) {
        suppressNextCardClickRef.current = true
        window.setTimeout(() => {
          suppressNextCardClickRef.current = false
        }, 0)
        onConnectCorrelativity(
          cableDrag.sourceSubjectId,
          targetId,
          activeWireType,
        )
        setCableDrag(null)
        return
      }

      // Si el usuario solo hizo clic en el botón (+) sin arrastrar lejos hacia el vacío,
      // dejamos la flecha enganchada al cursor para que pueda mover el mouse sin mantener apretado.
      if (
        targetId === cableDrag.sourceSubjectId ||
        dragDistance <=
          SCROLL_METRICS_THRESHOLDS.CLICK_TO_STICKY_DRAG_DISTANCE_PX
      ) {
        setCableDrag((prev) =>
          prev
            ? {
                ...prev,
                isStickyClickMode: true,
              }
            : null,
        )
        return
      }

      setCableDrag(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === KEYBOARD_KEYS.ESCAPE) {
        setCableDrag(null)
      }
    }

    function handlePointerCancel() {
      setCableDrag(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointercancel', handlePointerCancel)
    window.addEventListener('blur', handlePointerCancel)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointercancel', handlePointerCancel)
      window.removeEventListener('blur', handlePointerCancel)
    }
  }, [cableDrag, activeWireType, onConnectCorrelativity])

  function startWireDrag(
    event: React.PointerEvent,
    sourceSubjectId: string,
  ) {
    event.stopPropagation()
    event.preventDefault()

    // Si ya había una flecha activa en modo clic y el usuario toca un puerto (+):
    // - Si es otra materia, completamos la conexión.
    // - Si es la misma materia de origen, cancelamos la flecha.
    if (cableDrag) {
      if (cableDrag.sourceSubjectId !== sourceSubjectId) {
        onConnectCorrelativity(
          cableDrag.sourceSubjectId,
          sourceSubjectId,
          activeWireType,
        )
      }
      setCableDrag(null)
      return
    }

    const surface = surfaceRef.current
    if (!surface) return

    const rect = surface.getBoundingClientRect()
    const coords = portPositions[sourceSubjectId]
    const startX = coords ? coords.outX : event.clientX - rect.left
    const startY = coords ? coords.outY : event.clientY - rect.top

    setCableDrag({
      sourceSubjectId,
      startX,
      startY,
      currentX: event.clientX - rect.left,
      currentY: event.clientY - rect.top,
      hoveredTargetId: null,
      isStickyClickMode: false,
    })
  }

  function toggleStickyWireFromKeyboard(sourceSubjectId: string) {
    if (cableDrag) {
      if (cableDrag.sourceSubjectId !== sourceSubjectId) {
        onConnectCorrelativity(
          cableDrag.sourceSubjectId,
          sourceSubjectId,
          activeWireType,
        )
      }
      setCableDrag(null)
      return
    }

    const coords = portPositions[sourceSubjectId]
    if (!coords) return

    setCableDrag({
      sourceSubjectId,
      startX: coords.outX,
      startY: coords.outY,
      currentX: coords.outX + 36,
      currentY: coords.outY,
      hoveredTargetId: null,
      isStickyClickMode: true,
    })
  }

  function consumeSuppressedCardClick(): boolean {
    if (suppressNextCardClickRef.current) {
      suppressNextCardClickRef.current = false
      return true
    }
    return false
  }

  const liveHoverCycleCheck = useMemo(() => {
    if (!cableDrag || !cableDrag.hoveredTargetId) return null
    return CorrelativityGraphHelper.detectCircularDependency(
      correlativities,
      cableDrag.hoveredTargetId,
      cableDrag.sourceSubjectId,
    )
  }, [cableDrag, correlativities])

  return {
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
  }
}
