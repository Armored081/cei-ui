import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Artifact } from '../hooks/useChatEngine'
import { TopBar } from '../primitives/TopBar'
import { MessageList } from '../primitives/MessageList'
import { Composer } from '../primitives/Composer'
import { composerPropsFromEngine } from '../primitives/composerPropsFromEngine'
import { SlideOver } from '../primitives/SlideOver'
import { SlideUpDrawer } from '../primitives/SlideUpDrawer'
import { ArtifactCard } from '../primitives/ArtifactCard'
import { ArtifactExpanded } from '../primitives/ArtifactExpanded'
import { ToolLogEntry } from '../primitives/ToolLogEntry'
import type { LayoutProps } from './types'
import './layout-command-center.css'

const COMPACT_VIEWPORT_QUERY = '(max-width: 1024px)'

function readIsCompactLayout(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(COMPACT_VIEWPORT_QUERY).matches
}

export function CommandCenter({ engine, userEmail, onLogout }: LayoutProps): JSX.Element {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [isCompactLayout, setIsCompactLayout] = useState<boolean>(readIsCompactLayout)
  const [mobileActivityOpen, setMobileActivityOpen] = useState(false)
  const [mobileArtifactsOpen, setMobileArtifactsOpen] = useState(false)

  const selectedArtifact: Artifact | null = useMemo(
    (): Artifact | null => engine.artifacts.find((a) => a.id === selectedArtifactId) ?? null,
    [engine.artifacts, selectedArtifactId],
  )

  useEffect((): (() => void) => {
    if (typeof window.matchMedia !== 'function') {
      return (): void => {}
    }

    const mediaQuery = window.matchMedia(COMPACT_VIEWPORT_QUERY)

    const onViewportChange = (event: MediaQueryListEvent): void => {
      setIsCompactLayout(event.matches)
      if (!event.matches) {
        setMobileActivityOpen(false)
        setMobileArtifactsOpen(false)
      }
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onViewportChange)
      return (): void => mediaQuery.removeEventListener('change', onViewportChange)
    }

    mediaQuery.addListener(onViewportChange)
    return (): void => mediaQuery.removeListener(onViewportChange)
  }, [])

  const onToggleToolLogExpand = useCallback(
    (entryId: string): void => {
      const entry = engine.toolLog.find((t) => t.id === entryId)
      if (entry) {
        engine.onToggleTool(entry.sourceMessageId, entryId)
      }
    },
    [engine],
  )

  const onSelectArtifact = useCallback((artifactId: string): void => {
    setSelectedArtifactId(artifactId)
  }, [])

  const onSelectArtifactFromMessage = useCallback(
    (artifactId: string): void => {
      setSelectedArtifactId(artifactId)
      if (isCompactLayout) {
        setMobileArtifactsOpen(true)
      }
    },
    [isCompactLayout],
  )

  const gridClassName = `cei-cc-grid${leftCollapsed ? ' cei-cc-grid-left-collapsed' : ''}${
    rightCollapsed ? ' cei-cc-grid-right-collapsed' : ''
  }`

  return (
    <div className="cei-cc-shell">
      <TopBar userEmail={userEmail} onLogout={onLogout} />

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

      <div className={gridClassName}>
        {/* Left rail: Activity */}
        <aside className={`cei-cc-left${leftCollapsed ? ' cei-cc-rail-collapsed' : ''}`}>
          {leftCollapsed ? (
            <button
              className="cei-cc-expand-btn cei-cc-expand-left"
              onClick={(): void => setLeftCollapsed(false)}
              title="Expand activity rail"
              type="button"
              aria-label="Expand activity rail"
            >
              &rsaquo;
            </button>
          ) : (
            <>
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
                  engine.toolLog.map((entry, index) => (
                    <ToolLogEntry
                      key={entry.id}
                      entry={entry}
                      isActive={entry.status === 'running' || index === 0}
                      onToggleExpand={onToggleToolLogExpand}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </aside>

        {/* Center: Conversation */}
        <main className="cei-cc-center">
          <div className="cei-cc-mobile-controls">
            <button
              aria-haspopup="dialog"
              className="cei-cc-mobile-control-btn"
              onClick={(): void => setMobileActivityOpen(true)}
              type="button"
            >
              Menu Activity
            </button>
            <button
              aria-haspopup="dialog"
              className="cei-cc-mobile-control-btn"
              onClick={(): void => setMobileArtifactsOpen(true)}
              type="button"
            >
              Artifacts{' '}
              {engine.artifacts.length > 0 ? `(${engine.artifacts.length.toString()})` : ''}
            </button>
          </div>
          <MessageList
            items={engine.timelineItems}
            listRef={engine.messageListRef}
            onRetryMessage={engine.onRetryMessage}
            onScroll={engine.updateMessageScrollIntent}
            onToggleTool={engine.onToggleTool}
            displayMode="clean"
            blockRenderer="pill"
            onArtifactClick={onSelectArtifactFromMessage}
          />
          <Composer {...composerPropsFromEngine(engine, 'full')} />
        </main>

        {/* Right rail: Artifacts */}
        <aside className={`cei-cc-right${rightCollapsed ? ' cei-cc-rail-collapsed' : ''}`}>
          {rightCollapsed ? (
            <button
              className="cei-cc-expand-btn cei-cc-expand-right"
              onClick={(): void => setRightCollapsed(false)}
              title="Expand artifacts rail"
              type="button"
              aria-label="Expand artifacts rail"
            >
              &lsaquo;
            </button>
          ) : (
            <>
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
                      onClick={onSelectArtifact}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      <SlideOver
        isOpen={isCompactLayout && mobileActivityOpen}
        onClose={(): void => setMobileActivityOpen(false)}
        title="Activity"
        width="320px"
      >
        <div className="cei-cc-tool-log">
          {engine.toolLog.length === 0 ? (
            <p className="cei-muted cei-cc-empty-hint">Tool calls will appear here.</p>
          ) : (
            engine.toolLog.map((entry, index) => (
              <ToolLogEntry
                key={entry.id}
                entry={entry}
                isActive={entry.status === 'running' || index === 0}
                onToggleExpand={onToggleToolLogExpand}
              />
            ))
          )}
        </div>
      </SlideOver>

      <SlideUpDrawer
        isOpen={isCompactLayout && mobileArtifactsOpen}
        onClose={(): void => setMobileArtifactsOpen(false)}
        title="Artifacts"
        maxHeight="72vh"
      >
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
                onClick={onSelectArtifact}
              />
            ))
          )}
        </div>
      </SlideUpDrawer>
    </div>
  )
}
