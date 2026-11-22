import type { Career, Subject, SubjectPeriod } from './academic.types'

export type ToastTone = 'success' | 'warning' | 'danger' | 'info'

export interface ToastMessage {
  id: string
  type: ToastTone
  title: string
  message: string
}

export type ModalHeaderTone = 'default' | 'danger' | 'warning'

export type ConfirmTone = 'danger' | 'warning'

export interface ConfirmDialogConfig {
  title: string
  description: string
  impactDetail?: string
  confirmLabel: string
  tone?: ConfirmTone
  onConfirm: () => void
}

export interface PendingFailedOperation {
  description: string
  retryFn: () => void
}

export interface CareerModalState {
  open: boolean
  careerToEdit: Career | null
}

export interface SubjectModalState {
  open: boolean
  subjectToEdit: Subject | null
  defaultYear: number | null
  defaultPeriod: SubjectPeriod | null
}
