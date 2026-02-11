import { useState } from 'react'

import type { Artifact } from '../hooks/useChatEngine'
import { TopBar } from '../primitives/TopBar'
import { MessageList } from '../primitives/MessageList'
import { Composer } from '../primitives/Composer'
import { composerPropsFromEngine } from '../primitives/composerPropsFromEngine'
import { FAB } from '../primitives/FAB'
import { SlideUpDrawer } from '../primitives/SlideUpDrawer'
import { SlideOver } from '../primitives/SlideOver'
import { ToolLogEntry } from '../primitives/ToolLogEntry'
import { ArtifactCard } from '../primitives/ArtifactCard'
import { ArtifactExpanded } from '../primitives/ArtifactExpanded'
import type { LayoutProps } from './types'
import './layout-focus.css'

export function Focus({
  engine,
  userEmail,
  onLogout,
  activeLayout,
  onChangeLayout,
}: LayoutProps): JSX.Element {
  const [toolDrawerOpen, setToolDrawerOpen] = useState(false)
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false)
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)

  const selectedArtifact: Artifact | null =
    engine.artifacts.find((a) => a.id === selectedArtifactId) ?? null

  const onToggleToolLogExpand = (entryId: string): void => {
    const entry = engine.toolLog.find((t) => t.id === entryId)
    if (entry) {
      engine.onToggleTool(entry.sourceMessageId, entryId)
    }
  }

  const onArtifactClick = (artifactId: string): void => {
    setSelectedArtifactId(artifactId)
    setArtifactPanelOpen(true)
  }

  return (
    <div className="cei-focus-shell">
      <TopBar
        activeLayout={activeLayout}
        onChangeLayout={onChangeLayout}
        userEmail={userEmail}
        onLogout={onLogout}
      />

      {engine.errorBanner ? (
        <div className="cei-error-banner cei-focus-banner" role="alert">
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
        <div className="cei-connection-indicator cei-focus-connecting" data-testid="connecting-indicator">
          <span aria-hidden="true" className="cei-spinner" />
          Connecting to CEI service...
        </div>
      ) : null}

      <main className="cei-focus-main">
        <div className="cei-focus-column">
          <MessageList
            items={engine.timelineItems}
            listRef={engine.messageListRef}
            onRetryMessage={engine.onRetryMessage}
            onScroll={engine.updateMessageScrollIntent}
            onToggleTool={engine.onToggleTool}
            displayMode="clean"
            blockRenderer="mini-card"
            onArtifactClick={onArtifactClick}
          />
          <Composer {...composerPropsFromEngine(engine, 'floating')} />
        </div>
      </main>

      {/* Tool log FAB */}
      <FAB
        label={`Tools ${engine.toolLog.length > 0 ? engine.toolLog.length.toString() : ''}`}
        badge={engine.toolLog.filter((t) => t.status === 'running').length}
        onClick={(): void => setToolDrawerOpen(true)}
        position="bottom-left"
      />

      {/* Artifact FAB */}
      <FAB
        label={`Artifacts ${engine.artifacts.length > 0 ? engine.artifacts.length.toString() : ''}`}
        badge={engine.artifacts.length}
        onClick={(): void => setArtifactPanelOpen(true)}
        position="bottom-right"
      />

      {/* Tool drawer */}
      <SlideUpDrawer
        isOpen={toolDrawerOpen}
        onClose={(): void => setToolDrawerOpen(false)}
        title="Tool Log"
      >
        <div className="cei-focus-tool-list">
          {engine.toolLog.length === 0 ? (
            <p className="cei-muted">No tool calls yet.</p>
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
      </SlideUpDrawer>

      {/* Artifact panel */}
      <SlideOver
        isOpen={artifactPanelOpen}
        onClose={(): void => {
          setArtifactPanelOpen(false)
          setSelectedArtifactId(null)
        }}
        title="Artifacts"
      >
        {selectedArtifact ? (
          <ArtifactExpanded
            artifact={selectedArtifact}
            onClose={(): void => setSelectedArtifactId(null)}
          />
        ) : engine.artifacts.length === 0 ? (
          <p className="cei-muted">No artifacts yet.</p>
        ) : (
          <div className="cei-focus-artifact-list">
            {engine.artifacts.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                isSelected={artifact.id === selectedArtifactId}
                onClick={setSelectedArtifactId}
              />
            ))}
          </div>
        )}
      </SlideOver>
    </div>
  )
}
