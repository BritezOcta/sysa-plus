import type { ReactNode } from 'react'
import styles from '../academic/Modals.module.css'

interface ErrorBannerProps {
  title: string
  children: ReactNode
}

export default function ErrorBanner({ title, children }: ErrorBannerProps) {
  return (
    <div className={styles.errorBanner} role="alert">
      <strong>{title}:</strong> {children}
    </div>
  )
}
