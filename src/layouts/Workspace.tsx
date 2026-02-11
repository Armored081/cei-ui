import { useMemo, useState } from 'react'

import type { Artifact } from '../hooks/useChatEngine'
import { TopBar } from '../primitives/TopBar'
import { MessageList } from '../primitives/MessageList'
import { Composer } from '../primitives/Composer'
import { composerPropsFromEngine } from '../primitives/composerPropsFromEngine'
import { ResizableSplit } from '../primitives/ResizableSplit'
import { TabBar, type TabItem } from '../primitives/TabBar'
import { ArtifactCard } from '../primitives/ArtifactCard'
import { ArtifactExpanded } from '../primitives/ArtifactExpanded'
import { ToolLogEntry } from '../primitives/ToolLogEntry'
import type { LayoutProps } from './types'
import './layout-workspace.css'

type DockTab = 'artifacts' | 'tools' | 'tasks'

export function Workspace({
  engine,
  userEmail,
  onLogout,
  activeLayout,
  onChangeLayout,
}: LayoutProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<DockTab>('artifacts')
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)

  const selectedArtifact: Artifact | null =
    engine.artifacts.find((a) => a.id === selectedArtifactId) ?? null

  const tabs = useMemo(
    (): TabItem[] => [
      { id: 'artifacts', label: 'Artifacts', badge: engine.artifacts.length },
      { id: 'tools', label: 'Tool Log', badge: engine.toolLog.filter((t) => t.status === 'running').length },
      { id: 'tasks', label: 'Tasks' },
    ],
    [engine.artifacts.length, engine.toolLog],
  )

  const onToggleToolLogExpand = (entryId: string): void => {
    const entry = engine.toolLog.find((t) => t.id === entryId)
    if (entry) {
      engine.onToggleTool(entry.sourceMessageId, entryId)
    }
  }

  const onArtifactClick = (artifactId: string): void => {
    setSelectedArtifactId(artifactId)
    setActiveTab('artifacts')
  }

  const topContent = (
    <div className="cei-ws-top">
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

      <MessageList
        items={engine.timelineItems}
        listRef={engine.messageListRef}
        onRetryMessage={engine.onRetryMessage}
        onScroll={engine.updateMessageScrollIntent}
        onToggleTool={engine.onToggleTool}
        displayMode="clean"
        blockRenderer="tag"
        onArtifactClick={onArtifactClick}
      />
      <Composer {...composerPropsFromEngine(engine, 'compact')} />
    </div>
  )

  const bottomContent = (
    <div className="cei-ws-dock">
      <TabBar
        tabs={tabs}
        activeTabId={activeTab}
        onTabChange={(tabId): void => setActiveTab(tabId as DockTab)}
      />

      <div className="cei-ws-dock-body">
        {activeTab === 'artifacts' ? (
          selectedArtifact ? (
            <ArtifactExpanded
              artifact={selectedArtifact}
              onClose={(): void => setSelectedArtifactId(null)}
            />
          ) : (
            <div className="cei-ws-artifact-strip">
              {engine.artifacts.length === 0 ? (
                <p className="cei-muted">Artifacts will appear here.</p>
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
          )
        ) : activeTab === 'tools' ? (
          <div className="cei-ws-tool-list">
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
        ) : (
          <p className="cei-muted">Task tracking coming soon.</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="cei-ws-shell">
      <TopBar
        activeLayout={activeLayout}
        onChangeLayout={onChangeLayout}
        userEmail={userEmail}
        onLogout={onLogout}
      />
      <div className="cei-ws-split-container">
        <ResizableSplit
          direction="vertical"
          initialRatio={0.55}
          minRatio={0.25}
          maxRatio={0.8}
          topContent={topContent}
          bottomContent={bottomContent}
        />
      </div>
    </div>
  )
}
