import {
  BEZIER_CURVE_CONFIG,
  DOM_DATA_ATTRIBUTES,
  SCROLL_METRICS_THRESHOLDS,
} from '../constants'
import type { PortCoords } from '../types'

export class CanvasGeometryHelper {
  static buildBezierPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): string {
    const dx = Math.abs(x2 - x1)
    const controlOffset = Math.max(
      BEZIER_CURVE_CONFIG.MIN_CONTROL_OFFSET,
      Math.min(
        BEZIER_CURVE_CONFIG.MAX_CONTROL_OFFSET,
        dx * BEZIER_CURVE_CONFIG.CURVATURE_FACTOR,
      ),
    )
    const cx1 = x1 + controlOffset
    const cy1 = y1
    const cx2 = x2 - controlOffset
    const cy2 = y2
    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
  }

  static getMidPoint(
    fromPos: PortCoords,
    toPos: PortCoords,
  ): { midX: number; midY: number } {
    return {
      midX: (fromPos.outX + toPos.inX) / 2,
      midY: (fromPos.outY + toPos.inY) / 2,
    }
  }

  static measureAllCardPorts(surfaceElement: HTMLElement): Record<string, PortCoords> {
    const surfaceRect = surfaceElement.getBoundingClientRect()
    const nextPositions: Record<string, PortCoords> = {}

    const cards = surfaceElement.querySelectorAll<HTMLElement>(
      DOM_DATA_ATTRIBUTES.SUBJECT_CARD_SELECTOR,
    )

    cards.forEach((cardEl) => {
      const subjId = cardEl.getAttribute(DOM_DATA_ATTRIBUTES.SUBJECT_CARD)
      if (!subjId) return

      const inPort = cardEl.querySelector<HTMLElement>(
        DOM_DATA_ATTRIBUTES.PORT_IN_SELECTOR,
      )
      const outPort = cardEl.querySelector<HTMLElement>(
        DOM_DATA_ATTRIBUTES.PORT_OUT_SELECTOR,
      )
      const cardRect = cardEl.getBoundingClientRect()

      const inRect = inPort ? inPort.getBoundingClientRect() : cardRect
      const outRect = outPort ? outPort.getBoundingClientRect() : cardRect

      nextPositions[subjId] = {
        inX: inRect.left - surfaceRect.left + inRect.width / 2,
        inY: inRect.top - surfaceRect.top + inRect.height / 2,
        outX: outRect.left - surfaceRect.left + outRect.width / 2,
        outY: outRect.top - surfaceRect.top + outRect.height / 2,
      }
    })

    return nextPositions
  }

  static isNativeScrollbarOffscreen(
    surfaceElement: HTMLElement,
    viewportElement: HTMLElement,
  ): boolean {
    const viewportRect = viewportElement.getBoundingClientRect()
    const hasHorizontalOverflow =
      surfaceElement.scrollWidth >
      viewportElement.clientWidth + SCROLL_METRICS_THRESHOLDS.OVERFLOW_TOLERANCE_PX
    const isBottomBelowWindow =
      viewportRect.bottom >
      window.innerHeight + SCROLL_METRICS_THRESHOLDS.OVERFLOW_TOLERANCE_PX
    const isTopAboveWindowBottom =
      viewportRect.top <
      window.innerHeight - SCROLL_METRICS_THRESHOLDS.MIN_VISIBLE_TOP_PX

    return (
      hasHorizontalOverflow && isBottomBelowWindow && isTopAboveWindowBottom
    )
  }

  static findSubjectIdAtPoint(clientX: number, clientY: number): string | null {
    const elementUnderPointer = document.elementFromPoint(clientX, clientY)
    const cardElement = elementUnderPointer?.closest<HTMLElement>(
      DOM_DATA_ATTRIBUTES.SUBJECT_CARD_SELECTOR,
    )
    return cardElement?.getAttribute(DOM_DATA_ATTRIBUTES.SUBJECT_CARD) ?? null
  }
}
