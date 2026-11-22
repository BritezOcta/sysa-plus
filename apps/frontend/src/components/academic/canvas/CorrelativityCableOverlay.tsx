import {
  CABLE_BADGE_GEOMETRY,
  CABLE_COLORS,
  CABLE_MARKER_URLS,
  SVG_MARKER_IDS,
} from '../../../constants'
import { AcademicFormatHelper, CanvasGeometryHelper } from '../../../helpers'
import type {
  CableDragState,
  ConnectedChain,
  Correlativity,
  CorrelativityType,
  PortCoords,
  Subject,
} from '../../../types'
import styles from '../CurriculumCanvas.module.css'

interface CorrelativityCableOverlayProps {
  correlativities: Correlativity[]
  portPositions: Record<string, PortCoords>
  connectedChain: ConnectedChain
  showAllCables: boolean
  effectiveFocusId: string | null
  cableDrag: CableDragState | null
  hasLiveCycleConflict: boolean
  activeWireType: CorrelativityType
  simMode: boolean
  subjectMap: Map<string, Subject>
  onCycleCorrelativityType: (correlativityId: string) => void
  onRemoveCorrelativity: (correlativityId: string) => void
}

export default function CorrelativityCableOverlay({
  correlativities,
  portPositions,
  connectedChain,
  showAllCables,
  effectiveFocusId,
  cableDrag,
  hasLiveCycleConflict,
  activeWireType,
  simMode,
  subjectMap,
  onCycleCorrelativityType,
  onRemoveCorrelativity,
}: CorrelativityCableOverlayProps) {
  const dragStrokeKey = hasLiveCycleConflict ? 'conflict' : activeWireType

  return (
    <svg className={styles.svgOverlay}>
      <defs>
        <marker
          id={SVG_MARKER_IDS.AMBER}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path
            d="M 0 1 L 7 4 L 0 7 z"
            fill={CABLE_COLORS.regularizada_cursar}
          />
        </marker>
        <marker
          id={SVG_MARKER_IDS.BLUE}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M 0 1 L 7 4 L 0 7 z" fill={CABLE_COLORS.aprobada_cursar} />
        </marker>
        <marker
          id={SVG_MARKER_IDS.GREEN}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M 0 1 L 7 4 L 0 7 z" fill={CABLE_COLORS.aprobada_rendir} />
        </marker>
        <marker
          id={SVG_MARKER_IDS.DANGER}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M 0 1 L 7 4 L 0 7 z" fill={CABLE_COLORS.conflict} />
        </marker>
      </defs>

      {correlativities.map((corr) => {
        const fromPos = portPositions[corr.requiresSubjectId]
        const toPos = portPositions[corr.subjectId]
        if (!fromPos || !toPos) return null

        const isUpstream = connectedChain.upstreamEdgeIds.has(corr.id)
        const isDownstream = connectedChain.downstreamEdgeIds.has(corr.id)
        const isHighlighted = isUpstream || isDownstream

        if (!showAllCables && !isHighlighted) return null

        const isDimmed =
          Boolean(effectiveFocusId) && !isHighlighted && !cableDrag

        const pathD = CanvasGeometryHelper.buildBezierPath(
          fromPos.outX,
          fromPos.outY,
          toPos.inX,
          toPos.inY,
        )
        const { midX, midY } = CanvasGeometryHelper.getMidPoint(fromPos, toPos)

        const strokeColor = CABLE_COLORS[corr.type]
        const markerId = CABLE_MARKER_URLS[corr.type]
        const labels = AcademicFormatHelper.formatCorrelativityTypeLabel(
          corr.type,
        )
        const shortTag = labels.badgeCode

        const prereqSubj = subjectMap.get(corr.requiresSubjectId)
        const targetSubj = subjectMap.get(corr.subjectId)

        return (
          <g
            key={corr.id}
            className={`${styles.cableGroup} ${
              isHighlighted ? styles.cableHighlighted : ''
            } ${isDimmed ? styles.cableDimmed : ''}`}
          >
            {isHighlighted && (
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={CABLE_BADGE_GEOMETRY.HIGHLIGHT_GLOW_WIDTH}
                strokeOpacity={CABLE_BADGE_GEOMETRY.HIGHLIGHT_GLOW_OPACITY}
              />
            )}

            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth={
                isHighlighted
                  ? CABLE_BADGE_GEOMETRY.STROKE_WIDTH_HIGHLIGHTED
                  : CABLE_BADGE_GEOMETRY.STROKE_WIDTH_DEFAULT
              }
              strokeDasharray={
                isHighlighted
                  ? CABLE_BADGE_GEOMETRY.DASH_ARRAY_HIGHLIGHTED
                  : undefined
              }
              markerEnd={markerId}
              className={isHighlighted ? styles.animatedDashPath : undefined}
            />

            {isHighlighted && !simMode && (
              <foreignObject
                x={midX - CABLE_BADGE_GEOMETRY.OFFSET_X}
                y={midY - CABLE_BADGE_GEOMETRY.OFFSET_Y}
                width={CABLE_BADGE_GEOMETRY.WIDTH}
                height={CABLE_BADGE_GEOMETRY.HEIGHT}
                className={styles.cableBadgeForeign}
              >
                <div className={styles.cableMidPill}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCycleCorrelativityType(corr.id)
                    }}
                    title={`Cambiar condición (${prereqSubj?.code} ➔ ${targetSubj?.code}): ${labels.full}`}
                    aria-label={`Cambiar condición de correlatividad de ${prereqSubj?.code ?? ''} hacia ${targetSubj?.code ?? ''} (actual: ${shortTag})`}
                    className={`${styles.cableTypeSwitch} ${
                      styles[`switch_${corr.type}`]
                    }`}
                  >
                    {shortTag} ↻
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveCorrelativity(corr.id)
                    }}
                    title="Eliminar correlatividad"
                    aria-label={`Eliminar correlatividad de ${prereqSubj?.code ?? ''} hacia ${targetSubj?.code ?? ''}`}
                    className={styles.cableDeleteBtn}
                  >
                    ✕
                  </button>
                </div>
              </foreignObject>
            )}
          </g>
        )
      })}

      {cableDrag && (
        <g>
          <path
            d={CanvasGeometryHelper.buildBezierPath(
              cableDrag.startX,
              cableDrag.startY,
              cableDrag.currentX,
              cableDrag.currentY,
            )}
            fill="none"
            stroke={CABLE_COLORS[dragStrokeKey]}
            strokeWidth={CABLE_BADGE_GEOMETRY.STROKE_WIDTH_DRAGGING}
            strokeDasharray={CABLE_BADGE_GEOMETRY.DASH_ARRAY_DRAGGING}
            markerEnd={CABLE_MARKER_URLS[dragStrokeKey]}
            className={styles.animatedDashPath}
          />
        </g>
      )}
    </svg>
  )
}
