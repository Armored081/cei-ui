import { useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import { ArtifactRegistry } from '../artifacts/ArtifactRegistry'
import type { Artifact } from '../hooks/useChatEngine'
import { ConfidenceBadge } from './ConfidenceBadge'
import { ReasoningSection } from './ReasoningSection'
import { useDialogFocusTrap } from './useDialogFocusTrap'
import './artifact-fullscreen.css'

interface ArtifactFullScreenProps {
  artifact: Artifact
  onBack: () => void
  onClose: () => void
  onEscape: () => void
  onToggleFullScreen: () => void
}

function unsupportedArtifactContent(kind: string): JSX.Element {
  return <p className="cei-artifact-fullscreen-empty">No renderer registered for "{kind}".</p>
}

export function ArtifactFullScreen({
  artifact,
  onBack,
  onClose,
  onEscape,
  onToggleFullScreen,
}: ArtifactFullScreenProps): JSX.Element {
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
      onEscape()
    }
  }

  return (
    <div className="cei-artifact-fullscreen-root">
      <div
        aria-label={`Full-screen artifact: ${artifact.title}`}
        aria-modal="true"
        className="cei-artifact-fullscreen-panel"
        onKeyDown={onPanelKeyDown}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="cei-artifact-fullscreen-toolbar">
          <button
            aria-label="Back"
            className="cei-artifact-fullscreen-btn"
            onClick={onBack}
            type="button"
          >
            ◀
          </button>
          <div className="cei-artifact-fullscreen-title-wrap">
            <h2 className="cei-artifact-fullscreen-title">{artifact.title}</h2>
            <ConfidenceBadge
              confidence={artifact.confidence}
              confidenceDecay={artifact.confidenceDecay}
            />
          </div>
          <div className="cei-artifact-fullscreen-actions">
            <button
              aria-label="Minimize artifact view"
              className="cei-artifact-fullscreen-btn"
              onClick={onToggleFullScreen}
              type="button"
            >
              ⛶
            </button>
            <button
              aria-label="Close artifact view"
              className="cei-artifact-fullscreen-btn"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
        </header>

        <div className="cei-artifact-fullscreen-body">
          <div className="cei-artifact-fullscreen-renderer">
            {definition
              ? definition.renderFullScreen(artifact, undefined, onClose, onToggleFullScreen)
              : unsupportedArtifactContent(artifact.kind)}
          </div>
          <ReasoningSection reasoning={artifact.reasoning} />
        </div>
      </div>
    </div>
  )
}
