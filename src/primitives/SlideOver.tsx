import { useEffect, useRef, type ReactNode } from 'react'
import './slide-over.css'

interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  width?: string
  children: ReactNode
}

export function SlideOver({
  isOpen,
  onClose,
  title,
  width,
  children,
}: SlideOverProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !panelRef.current) return

    const panel = panelRef.current
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    first?.focus()

    const onTab = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    panel.addEventListener('keydown', onTab)
    return () => panel.removeEventListener('keydown', onTab)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="cei-slide-over-backdrop" onClick={onClose} role="presentation">
      <div
        className="cei-slide-over-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel'}
        style={width ? { width } : undefined}
        onClick={(e): void => e.stopPropagation()}
      >
        <div className="cei-slide-over-header">
          {title ? <h3 className="cei-slide-over-title">{title}</h3> : null}
          <button
            className="cei-slide-over-close"
            onClick={onClose}
            type="button"
            aria-label="Close panel"
          >
            &times;
          </button>
        </div>
        <div className="cei-slide-over-body">{children}</div>
      </div>
    </div>
  )
}
