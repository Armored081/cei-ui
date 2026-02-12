import { useEffect, type ReactNode } from 'react'
import './slide-up-drawer.css'

interface SlideUpDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  maxHeight?: string
  children: ReactNode
}

export function SlideUpDrawer({
  isOpen,
  onClose,
  title,
  maxHeight,
  children,
}: SlideUpDrawerProps): JSX.Element | null {
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="cei-slide-up-backdrop" onClick={onClose} role="presentation">
      <div
        className="cei-slide-up-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Drawer'}
        style={maxHeight ? { maxHeight } : undefined}
        onClick={(e): void => e.stopPropagation()}
      >
        <div className="cei-slide-up-header">
          {title ? <h3 className="cei-slide-up-title">{title}</h3> : null}
          <button
            className="cei-slide-up-close"
            onClick={onClose}
            type="button"
            aria-label="Close drawer"
          >
            &times;
          </button>
        </div>
        <div className="cei-slide-up-body">{children}</div>
      </div>
    </div>
  )
}
