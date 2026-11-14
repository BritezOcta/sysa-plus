export const FOCUSABLE_ELEMENTS_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const TOAST_CONFIG = {
  DURATION_MS: 4500,
  MAX_PREVIOUS_KEPT: 3,
} as const

export const NETWORK_SIMULATION_CONFIG = {
  RETRY_DELAY_MS: 450,
} as const

export const ID_COUNTER_CONFIG = {
  INITIAL_SEED: 1000,
} as const

export const KEYBOARD_KEYS = {
  ESCAPE: 'Escape',
  TAB: 'Tab',
} as const
