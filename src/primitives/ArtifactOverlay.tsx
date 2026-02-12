import { useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import { ArtifactRegistry } from '../artifacts/ArtifactRegistry'
import type { Artifact } from '../hooks/useChatEngine'
import { ConfidenceBadge } from './ConfidenceBadge'
import { ReasoningSection } from './ReasoningSection'
import { useDialogFocusTrap } from './useDialogFocusTrap'
import './artifact-overlay.css'

interface ArtifactOverlayProps {
  artifact: Artifact
  onBack: () => void
  onClose: () => void
  onToggleFullScreen: () => void
  onPrevArtifact?: (() => void) | null
  onNextArtifact?: (() => void) | null
  artifactPosition?: string
  closeOnBackdropClick?: boolean
}

function unsupportedArtifactContent(kind: string): JSX.Element {
  return <p className="cei-artifact-overlay-empty">No renderer registered for "{kind}".</p>
}

export function ArtifactOverlay({
  artifact,
  onBack,
  onClose,
  onToggleFullScreen,
  onPrevArtifact,
  onNextArtifact,
  artifactPosition,
  closeOnBackdropClick = true,
}: ArtifactOverlayProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null)
  const definition = ArtifactRegistry.get(artifact.kind)

  useDialogFocusTrap({
    containerRef: panelRef,
    isOpen: true,
  })

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onBack()
      return
    }

    if (event.key.toLocaleLowerCase() === 'f') {
      event.preventDefault()
      event.stopPropagation()
      onToggleFullScreen()
      return
    }

    if (event.key === 'ArrowLeft' && onPrevArtifact) {
      event.preventDefault()
      event.stopPropagation()
      onPrevArtifact()
      return
    }

    if (event.key === 'ArrowRight' && onNextArtifact) {
      event.preventDefault()
      event.stopPropagation()
      onNextArtifact()
    }
  }

  const onBackdropClick = (): void => {
    if (closeOnBackdropClick) {
      onClose()
    }
  }

  return (
    <div className="cei-artifact-overlay-root">
      <div
        className="cei-artifact-overlay-backdrop"
        onClick={onBackdropClick}
        role="presentation"
      />
      <div
        aria-label={`Expanded artifact: ${artifact.title}`}
        aria-modal="true"
        className="cei-artifact-overlay-panel"
        onClick={(event): void => event.stopPropagation()}
        onKeyDown={onPanelKeyDown}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="cei-artifact-overlay-toolbar">
          <div className="cei-artifact-overlay-nav">
            <button
              aria-label="Back to artifact list"
              className="cei-artifact-overlay-btn"
              onClick={onBack}
              type="button"
            >
              ◀
            </button>
            <div className="cei-artifact-overlay-nav-arrows">
              <button
                aria-label="Previous artifact"
                className="cei-artifact-overlay-btn cei-artifact-overlay-nav-btn"
                disabled={!onPrevArtifact}
                onClick={onPrevArtifact ?? undefined}
                type="button"
              >
                ‹
              </button>
              {artifactPosition ? (
                <span className="cei-artifact-overlay-position">{artifactPosition}</span>
              ) : null}
              <button
                aria-label="Next artifact"
                className="cei-artifact-overlay-btn cei-artifact-overlay-nav-btn"
                disabled={!onNextArtifact}
                onClick={onNextArtifact ?? undefined}
                type="button"
              >
                ›
              </button>
            </div>
          </div>
          <div className="cei-artifact-overlay-title-wrap">
            <h2 className="cei-artifact-overlay-title">{artifact.title}</h2>
            <ConfidenceBadge
              confidence={artifact.confidence}
              confidenceDecay={artifact.confidenceDecay}
            />
          </div>
          <div className="cei-artifact-overlay-actions">
            <button
              aria-label="Open full-screen artifact view"
              className="cei-artifact-overlay-btn"
              onClick={onToggleFullScreen}
              type="button"
            >
              ⛶
            </button>
            <button
              aria-label="Close artifact view"
              className="cei-artifact-overlay-btn"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
        </header>
        <div className="cei-artifact-overlay-body">
          <div className="cei-artifact-overlay-renderer">
            {definition
              ? definition.renderExpanded(artifact, undefined, onClose)
              : unsupportedArtifactContent(artifact.kind)}
          </div>
          <ReasoningSection reasoning={artifact.reasoning} />
        </div>
      </div>
    </div>
  )
}
