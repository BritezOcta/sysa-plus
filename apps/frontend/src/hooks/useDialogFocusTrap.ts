import { useEffect } from 'react'
import { FOCUSABLE_ELEMENTS_SELECTOR, KEYBOARD_KEYS } from '../constants'

export function useDialogFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  initialFocusRef?: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus()
    } else if (containerRef.current) {
      const firstFocusable = containerRef.current.querySelector<HTMLElement>(
        FOCUSABLE_ELEMENTS_SELECTOR,
      )
      firstFocusable?.focus()
    }

    return () => {
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [containerRef, initialFocusRef])
}

export function handleDialogTrapKeyDown(
  event: React.KeyboardEvent<HTMLElement>,
  containerElement: HTMLElement | null,
  onEscape: () => void,
  canClose = true,
) {
  if (event.key === KEYBOARD_KEYS.ESCAPE) {
    event.stopPropagation()
    if (canClose) {
      onEscape()
    }
    return
  }

  if (event.key === KEYBOARD_KEYS.TAB && containerElement) {
    const focusableElements = Array.from(
      containerElement.querySelectorAll<HTMLElement>(
        FOCUSABLE_ELEMENTS_SELECTOR,
      ),
    )
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }
}
