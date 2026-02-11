import { useState } from 'react'

import type { Artifact } from '../hooks/useChatEngine'
import { TopBar } from '../primitives/TopBar'
import { MessageList } from '../primitives/MessageList'
import { Composer } from '../primitives/Composer'
import { composerPropsFromEngine } from '../primitives/composerPropsFromEngine'
import { ArtifactCard } from '../primitives/ArtifactCard'
import { ArtifactExpanded } from '../primitives/ArtifactExpanded'
import { ToolLogEntry } from '../primitives/ToolLogEntry'
import type { LayoutProps } from './types'
import './layout-command-center.css'

export function CommandCenter({
  engine,
  userEmail,
  onLogout,
  activeLayout,
  onChangeLayout,
}: LayoutProps): JSX.Element {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  const selectedArtifact: Artifact | null =
    engine.artifacts.find((a) => a.id === selectedArtifactId) ?? null

  const onToggleToolLogExpand = (entryId: string): void => {
    const entry = engine.toolLog.find((t) => t.id === entryId)
    if (entry) {
      engine.onToggleTool(entry.sourceMessageId, entryId)
    }
  }

  return (
    <div className="cei-cc-shell">
      <TopBar
        activeLayout={activeLayout}
        onChangeLayout={onChangeLayout}
        userEmail={userEmail}
        onLogout={onLogout}
      />

      {engine.errorBanner ? (
        <div className="cei-error-banner" role="alert">
          <span>{engine.errorBanner}</span>
          <button
            aria-label="Dismiss error"
            className="cei-error-dismiss"
            onClick={(): void => engine.setErrorBanner('')}
            type="button"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {engine.streamStatus === 'connecting' ? (
        <div className="cei-connection-indicator" data-testid="connecting-indicator">
          <span aria-hidden="true" className="cei-spinner" />
          Connecting to CEI service...
        </div>
      ) : null}

      <div className="cei-cc-grid">
        {/* Left rail: Activity */}
        {!leftCollapsed ? (
          <aside className="cei-cc-left">
            <div className="cei-cc-rail-header">
              <h3 className="cei-cc-rail-title">Activity</h3>
              <button
                className="cei-cc-collapse-btn"
                onClick={(): void => setLeftCollapsed(true)}
                type="button"
                aria-label="Collapse activity rail"
              >
                &lsaquo;
              </button>
            </div>
            <div className="cei-cc-tool-log">
              {engine.toolLog.length === 0 ? (
                <p className="cei-muted cei-cc-empty-hint">Tool calls will appear here.</p>
              ) : (
                engine.toolLog.map((entry) => (
                  <ToolLogEntry
                    key={entry.id}
                    entry={entry}
                    onToggleExpand={onToggleToolLogExpand}
                  />
                ))
              )}
            </div>
          </aside>
        ) : (
          <button
            className="cei-cc-expand-btn cei-cc-expand-left"
            onClick={(): void => setLeftCollapsed(false)}
            type="button"
            aria-label="Expand activity rail"
          >
            &rsaquo;
          </button>
        )}

        {/* Center: Conversation */}
        <main className="cei-cc-center">
          <MessageList
            items={engine.timelineItems}
            listRef={engine.messageListRef}
            onRetryMessage={engine.onRetryMessage}
            onScroll={engine.updateMessageScrollIntent}
            onToggleTool={engine.onToggleTool}
            displayMode="clean"
            blockRenderer="pill"
            onArtifactClick={setSelectedArtifactId}
          />
          <Composer {...composerPropsFromEngine(engine, 'full')} />
        </main>

        {/* Right rail: Artifacts */}
        {!rightCollapsed ? (
          <aside className="cei-cc-right">
            <div className="cei-cc-rail-header">
              <h3 className="cei-cc-rail-title">Artifacts</h3>
              <button
                className="cei-cc-collapse-btn"
                onClick={(): void => setRightCollapsed(true)}
                type="button"
                aria-label="Collapse artifacts rail"
              >
                &rsaquo;
              </button>
            </div>
            <div className="cei-cc-artifacts">
              {selectedArtifact ? (
                <ArtifactExpanded
                  artifact={selectedArtifact}
                  onClose={(): void => setSelectedArtifactId(null)}
                />
              ) : engine.artifacts.length === 0 ? (
                <p className="cei-muted cei-cc-empty-hint">Artifacts will appear here.</p>
              ) : (
                engine.artifacts.map((artifact) => (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    isSelected={artifact.id === selectedArtifactId}
                    onClick={setSelectedArtifactId}
                  />
                ))
              )}
            </div>
          </aside>
        ) : (
          <button
            className="cei-cc-expand-btn cei-cc-expand-right"
            onClick={(): void => setRightCollapsed(false)}
            type="button"
            aria-label="Expand artifacts rail"
          >
            &lsaquo;
          </button>
        )}
      </div>
    </div>
  )
}
