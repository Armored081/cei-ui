import { useMemo, useState } from 'react'

import type { Artifact, ToolLogItem } from '../hooks/useChatEngine.js'
import type { ContextRailMode } from '../hooks/useEntityPanel.js'
import { ActivityDrawer } from '../primitives/ActivityDrawer.js'
import { ArtifactCard } from '../primitives/ArtifactCard.js'
import { StoryCardList } from '../stories/StoryCardList.js'
import type { EntityReference, ModernContext } from '../types/modern-context.js'
import '../styles/context-rail.css'

interface ContextRailProps {
  artifacts: Artifact[]
  selectedArtifactId: string | null
  mode: ContextRailMode
  latestModernContext: ModernContext | null
  currentExchangeMessageId: string | null
  toolLog: ToolLogItem[]
  isActivityDrawerExpanded: boolean
  onSelectArtifact: (artifactId: string) => void
  onToggleActivityDrawer: () => void
  onEntityClick?: (entityRef: EntityReference, sourceMessageId?: string) => void
  latestContextMessageId?: string | null
  entityDetailPanel?: JSX.Element | null
  showActivityDrawer?: boolean
}

/**
 * Multi-mode context rail: artifacts, stories+artifacts, or entity detail.
 */
export function ContextRail({
  artifacts,
  selectedArtifactId,
  mode,
  latestModernContext,
  currentExchangeMessageId,
  toolLog,
  isActivityDrawerExpanded,
  onSelectArtifact,
  onToggleActivityDrawer,
  onEntityClick,
  latestContextMessageId,
  entityDetailPanel,
  showActivityDrawer = true,
}: ContextRailProps): JSX.Element {
  const [isTopologyOverlayOpenRaw, setIsTopologyOverlayOpen] = useState(false)

  // Only allow topology overlay to be open when in stories+artifacts mode
  const isTopologyOverlayOpen = mode === 'stories+artifacts' && isTopologyOverlayOpenRaw

  const storyCards = latestModernContext?.storyCards || []
  const hasStories = mode === 'stories+artifacts' && storyCards.length > 0
  const nodeCount = latestModernContext?.entityGraph.nodes.length || 0
  const edgeCount = latestModernContext?.entityGraph.edges.length || 0
  const shouldShowTopologyPreview = hasStories && nodeCount > 3

  const topologyPreviewNames = useMemo((): string[] => {
    if (!shouldShowTopologyPreview || !latestModernContext) {
      return []
    }

    return latestModernContext.entityGraph.nodes
      .slice(0, 5)
      .map((node) => node.name)
      .filter((name): boolean => Boolean(name))
  }, [latestModernContext, shouldShowTopologyPreview])

  const onStoryEntityClick = (entityRef: EntityReference): void => {
    onEntityClick?.(entityRef, latestContextMessageId || undefined)
  }

  if (mode === 'entity-detail') {
    return (
      <div className="cei-context-rail cei-context-rail-entity">
        {entityDetailPanel || (
          <p className="cei-context-rail-empty">Select an entity to view details.</p>
        )}
      </div>
    )
  }

  return (
    <div className="cei-context-rail">
      <div className="cei-context-rail-scroll">
        {hasStories ? (
          <section aria-label="Story cards" className="cei-context-rail-section">
            <header className="cei-context-rail-section-header">
              <h4 className="cei-context-rail-section-title">Story cards</h4>
            </header>
            <StoryCardList onEntityClick={onStoryEntityClick} stories={storyCards} />

            {shouldShowTopologyPreview ? (
              <section
                aria-label="Entity topology preview"
                className="cei-context-topology-preview"
              >
                <p className="cei-context-topology-title">Entity topology preview</p>
                <p className="cei-context-topology-meta">
                  {nodeCount.toString()} nodes • {edgeCount.toString()} edges
                </p>
                <div className="cei-context-topology-tags">
                  {topologyPreviewNames.map((name) => (
                    <span className="cei-context-topology-tag" key={name}>
                      {name}
                    </span>
                  ))}
                </div>
                <button
                  className="cei-context-topology-action"
                  onClick={(): void => setIsTopologyOverlayOpen(true)}
                  type="button"
                >
                  View Full Topology
                </button>
              </section>
            ) : null}
          </section>
        ) : null}

        <section aria-label="Artifacts" className="cei-context-rail-section">
          {hasStories ? (
            <header className="cei-context-rail-section-header">
              <h4 className="cei-context-rail-section-title">Artifacts</h4>
            </header>
          ) : null}
          <div className="cei-cc-artifacts" data-testid="context-rail-artifacts">
            {artifacts.length === 0 ? (
              <p className="cei-muted cei-cc-empty-hint">Artifacts will appear here.</p>
            ) : (
              artifacts.map((artifact) => (
                <ArtifactCard
                  artifact={artifact}
                  isSelected={artifact.id === selectedArtifactId}
                  key={artifact.id}
                  onClick={onSelectArtifact}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {showActivityDrawer ? (
        <ActivityDrawer
          currentExchangeMessageId={currentExchangeMessageId}
          isExpanded={isActivityDrawerExpanded}
          onToggleExpanded={onToggleActivityDrawer}
          toolLog={toolLog}
        />
      ) : null}

      {isTopologyOverlayOpen && mode === 'stories+artifacts' ? (
        <div
          aria-label="Full topology preview"
          className="cei-context-topology-overlay"
          role="dialog"
        >
          <div className="cei-context-topology-overlay-content">
            <h5>Full topology view</h5>
            <p>Coming soon in Phase 5.</p>
            <button
              className="cei-context-topology-action"
              onClick={(): void => setIsTopologyOverlayOpen(false)}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
