import type { ReactNode } from 'react'
import styles from '../academic/Modals.module.css'

interface FormFieldProps {
  htmlFor: string
  label: string
  required?: boolean
  error?: string | null
  errorId?: string
  hint?: string
  hintId?: string
  children: ReactNode
}

export default function FormField({
  htmlFor,
  label,
  required = false,
  error,
  errorId,
  hint,
  hintId,
  children,
}: FormFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor}>
        {label} {required && <span className={styles.req}>*</span>}
      </label>
      {children}
      {error && (
        <span id={errorId} className={styles.fieldError} role="alert">
          {error}
        </span>
      )}
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  )
}
