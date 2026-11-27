export const TEXT_SCALES = [90, 100, 115, 130] as const
export type TextScale = (typeof TEXT_SCALES)[number]

export const FONT_CHOICES = ['default', 'legible', 'dyslexic'] as const
export type FontChoice = (typeof FONT_CHOICES)[number]

export const SPACING_LEVELS = ['normal', 'medium', 'large'] as const
export type SpacingLevel = (typeof SPACING_LEVELS)[number]

export interface AccessibilitySettings {
  textScale: TextScale
  font: FontChoice
  lineHeight: SpacingLevel
  letterSpacing: SpacingLevel
  highContrast: boolean
  highlightLinks: boolean
  reduceMotion: boolean
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  textScale: 100,
  font: 'default',
  lineHeight: 'normal',
  letterSpacing: 'normal',
  highContrast: false,
  highlightLinks: false,
  reduceMotion: false,
}
