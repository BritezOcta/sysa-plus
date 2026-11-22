import type { CorrelativityType } from '../types'

export const VIEW_MODES = {
  CANVAS: 'canvas',
  TABLE: 'table',
} as const

export const CANVAS_SLOT_KEYS = {
  BANK: 'BANK',
  buildPeriodSlotKey: (year: number, period: number | string) =>
    `Y${year}-P${period}`,
} as const

export const CABLE_COLORS: Record<CorrelativityType | 'conflict', string> = {
  regularizada_cursar: '#f59e0b',
  aprobada_cursar: '#0284c7',
  aprobada_rendir: '#10b981',
  conflict: '#f43f5e',
} as const

export const SVG_MARKER_IDS = {
  AMBER: 'arrow-amber',
  BLUE: 'arrow-blue',
  GREEN: 'arrow-green',
  DANGER: 'arrow-danger',
} as const

export const CABLE_MARKER_URLS: Record<
  CorrelativityType | 'conflict',
  string
> = {
  regularizada_cursar: `url(#${SVG_MARKER_IDS.AMBER})`,
  aprobada_cursar: `url(#${SVG_MARKER_IDS.BLUE})`,
  aprobada_rendir: `url(#${SVG_MARKER_IDS.GREEN})`,
  conflict: `url(#${SVG_MARKER_IDS.DANGER})`,
} as const

export const BEZIER_CURVE_CONFIG = {
  MIN_CONTROL_OFFSET: 65,
  MAX_CONTROL_OFFSET: 220,
  CURVATURE_FACTOR: 0.48,
} as const

export const CABLE_BADGE_GEOMETRY = {
  WIDTH: 108,
  HEIGHT: 28,
  OFFSET_X: 54,
  OFFSET_Y: 14,
  HIGHLIGHT_GLOW_WIDTH: 6,
  HIGHLIGHT_GLOW_OPACITY: 0.25,
  STROKE_WIDTH_HIGHLIGHTED: 3,
  STROKE_WIDTH_DEFAULT: 2,
  STROKE_WIDTH_DRAGGING: 3.5,
  DASH_ARRAY_HIGHLIGHTED: '7 5',
  DASH_ARRAY_DRAGGING: '6 4',
} as const

export const SCROLL_METRICS_THRESHOLDS = {
  OVERFLOW_TOLERANCE_PX: 2,
  MIN_VISIBLE_TOP_PX: 36,
  CLICK_TO_STICKY_DRAG_DISTANCE_PX: 12,
} as const

export const DOM_DATA_ATTRIBUTES = {
  SUBJECT_CARD: 'data-subject-card',
  PORT_IN: 'data-port-in',
  PORT_OUT: 'data-port-out',
  SUBJECT_CARD_SELECTOR: '[data-subject-card]',
  PORT_IN_SELECTOR: '[data-port-in]',
  PORT_OUT_SELECTOR: '[data-port-out]',
} as const
