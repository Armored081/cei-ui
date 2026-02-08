import { useEffect, useRef } from 'react'

import './ConfirmationModal.css'

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Confirmation button style variants.
 */
export type ConfirmationModalConfirmVariant = 'default' | 'success' | 'danger'

/**
 * Optional input configuration for confirmation modal prompts.
 */
export interface ConfirmationModalInputConfig {
  label: string
  onChange: (nextValue: string) => void
  placeholder?: string
  required?: boolean
  value: string
}

/**
 * Props for the confirmation modal component.
 */
export interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  details?: string[]
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: ConfirmationModalConfirmVariant
  confirmDisabled?: boolean
  input?: ConfirmationModalInputConfig
  onConfirm: () => void
  onCancel: () => void
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))

  return elements.filter((element): boolean => {
    if (element.hasAttribute('disabled')) {
      return false
    }

    return element.tabIndex >= 0
  })
}

function toConfirmButtonClassName(variant: ConfirmationModalConfirmVariant): string {
  if (variant === 'success') {
    return 'cei-confirmation-modal-confirm cei-confirmation-modal-confirm-success'
  }

  if (variant === 'danger') {
    return 'cei-confirmation-modal-confirm cei-confirmation-modal-confirm-danger'
  }

  return 'cei-confirmation-modal-confirm cei-confirmation-modal-confirm-default'
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  details,
  confirmLabel,
  cancelLabel,
  confirmVariant,
  confirmDisabled,
  input,
  onConfirm,
  onCancel,
}: ConfirmationModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement | null>(null)

  const hasRequiredInputError = Boolean(input?.required && !input.value.trim())
  const isConfirmDisabled = Boolean(confirmDisabled || hasRequiredInputError)

  useEffect((): (() => void) | void => {
    if (!isOpen) {
      return
    }

    const modalElement = modalRef.current

    if (!modalElement) {
      return
    }

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const firstInput = modalElement.querySelector<HTMLInputElement>('input')
    const focusableElements = getFocusableElements(modalElement)

    if (firstInput) {
      firstInput.focus()
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    const onDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const currentFocusable = getFocusableElements(modalElement)

      if (currentFocusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = currentFocusable[0]
      const last = currentFocusable[currentFocusable.length - 1]
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null

      if (event.shiftKey) {
        if (!activeElement || activeElement === first || !modalElement.contains(activeElement)) {
          event.preventDefault()
          last.focus()
        }

        return
      }

      if (!activeElement || activeElement === last || !modalElement.contains(activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onDocumentKeyDown)

    return (): void => {
      document.removeEventListener('keydown', onDocumentKeyDown)
      previousFocus?.focus()
    }
  }, [isOpen, onCancel])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="cei-confirmation-modal-backdrop"
      onClick={(event): void => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
      role="presentation"
    >
      <div aria-modal="true" className="cei-confirmation-modal" ref={modalRef} role="dialog">
        <header className="cei-confirmation-modal-header">
          <h2>{title}</h2>
          <p>{message}</p>
        </header>

        {details && details.length > 0 ? (
          <ul className="cei-confirmation-modal-details" aria-label="Confirmation details">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}

        {input ? (
          <label className="cei-confirmation-modal-input" htmlFor="cei-confirmation-modal-input">
            <span>{input.label}</span>
            <input
              id="cei-confirmation-modal-input"
              onChange={(event): void => input.onChange(event.target.value)}
              placeholder={input.placeholder}
              required={input.required}
              type="text"
              value={input.value}
            />
          </label>
        ) : null}

        <footer className="cei-confirmation-modal-actions">
          <button className="cei-confirmation-modal-cancel" onClick={onCancel} type="button">
            {cancelLabel || 'Cancel'}
          </button>
          <button
            className={toConfirmButtonClassName(confirmVariant || 'default')}
            disabled={isConfirmDisabled}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel || 'Confirm'}
          </button>
        </footer>
      </div>
    </div>
  )
}
