import { useEffect } from 'react'

import './Toast.css'

/**
 * Toast severity variants.
 */
export type ToastVariant = 'success' | 'error' | 'info'

/**
 * Toast message payload.
 */
export interface ToastMessage {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastProps {
  durationMs?: number
  onDismiss: (toastId: string) => void
  toast: ToastMessage
}

/**
 * Toast viewport props.
 */
export interface ToastStackProps {
  durationMs?: number
  onDismiss: (toastId: string) => void
  toasts: ToastMessage[]
}

function toToastClassName(variant: ToastVariant): string {
  if (variant === 'success') {
    return 'cei-toast cei-toast-success'
  }

  if (variant === 'error') {
    return 'cei-toast cei-toast-error'
  }

  return 'cei-toast cei-toast-info'
}

function Toast({ durationMs, onDismiss, toast }: ToastProps): JSX.Element {
  useEffect((): (() => void) => {
    const timeoutMs = durationMs || 4000
    const timeoutId = window.setTimeout((): void => {
      onDismiss(toast.id)
    }, timeoutMs)

    return (): void => {
      window.clearTimeout(timeoutId)
    }
  }, [durationMs, onDismiss, toast.id])

  return (
    <article className={toToastClassName(toast.variant)} role="status">
      <div className="cei-toast-content">
        <p className="cei-toast-title">{toast.title}</p>
        {toast.description ? <p className="cei-toast-description">{toast.description}</p> : null}
      </div>
      <button
        aria-label={`Dismiss ${toast.title}`}
        className="cei-toast-dismiss"
        onClick={(): void => onDismiss(toast.id)}
        type="button"
      >
        Close
      </button>
    </article>
  )
}

export function ToastStack({ durationMs, onDismiss, toasts }: ToastStackProps): JSX.Element | null {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div aria-label="Notifications" className="cei-toast-stack">
      {toasts.map((toast) => (
        <Toast durationMs={durationMs} key={toast.id} onDismiss={onDismiss} toast={toast} />
      ))}
    </div>
  )
}
