import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { StructuredBlock } from '../agent/types.js'
import type { Artifact, ToolLogItem } from '../hooks/useChatEngine.js'
import type { ModernContext } from '../types/modern-context.js'
import { ContextRail } from './ContextRail.js'

const BLOCK: StructuredBlock = {
  kind: 'recommendation',
  severity: 'high',
  title: 'Patch vulnerable package',
  body: 'Upgrade dependency xyz immediately.',
}

const ARTIFACTS: Artifact[] = [
  {
    id: 'artifact-1',
    sourceMessageId: 'agent-1',
    segmentIndex: 0,
    block: BLOCK,
    kind: 'custom-kind',
    title: 'Patch vulnerable package',
  },
]

const TOOL_LOG: ToolLogItem[] = [
  {
    args: { query: 'latest package version' },
    id: 'tool-1',
    isExpanded: false,
    name: 'db_lookup',
    result: { summary: 'lookup complete' },
    sourceMessageId: 'agent-1',
    status: 'complete',
  },
]

function buildModernContext(nodeCount: number): ModernContext {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    type: 'risk' as const,
    id: `risk-${index.toString()}`,
    name: `Risk ${index.toString()}`,
  }))

  return {
    storyCards: [
      {
        id: 'story-1',
        title: 'Risk cluster elevated',
        severity: 'medium',
        narrative: 'Correlated controls show unusual activity.',
        correlatedEntities: [nodes[0]],
      },
    ],
    entityGraph: {
      nodes,
      edges: [],
    },
    vizHints: [],
    pivotTargets: [],
  }
}

function renderContextRail(
  mode: 'artifacts-only' | 'stories+artifacts' | 'entity-detail',
  modernContext: ModernContext | null,
): ReturnType<typeof render> {
  return render(
    <ContextRail
      artifacts={ARTIFACTS}
      currentExchangeMessageId="agent-1"
      isActivityDrawerExpanded={false}
      latestContextMessageId="agent-1"
      latestModernContext={modernContext}
      mode={mode}
      onEntityClick={vi.fn()}
      onSelectArtifact={vi.fn()}
      onToggleActivityDrawer={vi.fn()}
      selectedArtifactId={null}
      toolLog={TOOL_LOG}
    />,
  )
}

describe('ContextRail', (): void => {
  it('switches between artifacts-only, stories+artifacts, and entity-detail modes', (): void => {
    const view = renderContextRail('artifacts-only', buildModernContext(4))

    expect(screen.queryByRole('heading', { name: 'Story cards' })).not.toBeInTheDocument()
    expect(screen.getByText('Patch vulnerable package')).toBeInTheDocument()

    view.rerender(
      <ContextRail
        artifacts={ARTIFACTS}
        currentExchangeMessageId="agent-1"
        isActivityDrawerExpanded={false}
        latestContextMessageId="agent-1"
        latestModernContext={buildModernContext(4)}
        mode="stories+artifacts"
        onEntityClick={vi.fn()}
        onSelectArtifact={vi.fn()}
        onToggleActivityDrawer={vi.fn()}
        selectedArtifactId={null}
        toolLog={TOOL_LOG}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Story cards' })).toBeInTheDocument()

    view.rerender(
      <ContextRail
        artifacts={ARTIFACTS}
        currentExchangeMessageId="agent-1"
        entityDetailPanel={<div>Entity detail panel</div>}
        isActivityDrawerExpanded={false}
        latestContextMessageId="agent-1"
        latestModernContext={buildModernContext(4)}
        mode="entity-detail"
        onEntityClick={vi.fn()}
        onSelectArtifact={vi.fn()}
        onToggleActivityDrawer={vi.fn()}
        selectedArtifactId={null}
        toolLog={TOOL_LOG}
      />,
    )

    expect(screen.getByText('Entity detail panel')).toBeInTheDocument()
    expect(screen.queryByText('Patch vulnerable package')).not.toBeInTheDocument()
  })

  it('renders story cards section when latest modern context includes stories', (): void => {
    renderContextRail('stories+artifacts', buildModernContext(2))

    expect(screen.getByText('Risk cluster elevated')).toBeInTheDocument()
  })

  it('shows topology preview only when graph has more than three nodes', (): void => {
    const view = renderContextRail('stories+artifacts', buildModernContext(4))

    expect(screen.getByRole('button', { name: 'View Full Topology' })).toBeInTheDocument()
    expect(screen.getByText('4 nodes • 0 edges')).toBeInTheDocument()

    view.rerender(
      <ContextRail
        artifacts={ARTIFACTS}
        currentExchangeMessageId="agent-1"
        isActivityDrawerExpanded={false}
        latestContextMessageId="agent-1"
        latestModernContext={buildModernContext(3)}
        mode="stories+artifacts"
        onEntityClick={vi.fn()}
        onSelectArtifact={vi.fn()}
        onToggleActivityDrawer={vi.fn()}
        selectedArtifactId={null}
        toolLog={TOOL_LOG}
      />,
    )

    expect(screen.queryByRole('button', { name: 'View Full Topology' })).not.toBeInTheDocument()
  })

  it('preserves artifact listing and click behavior', (): void => {
    const onSelectArtifact = vi.fn()

    render(
      <ContextRail
        artifacts={ARTIFACTS}
        currentExchangeMessageId="agent-1"
        isActivityDrawerExpanded={false}
        latestContextMessageId="agent-1"
        latestModernContext={null}
        mode="artifacts-only"
        onSelectArtifact={onSelectArtifact}
        onToggleActivityDrawer={vi.fn()}
        selectedArtifactId={null}
        toolLog={TOOL_LOG}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Patch vulnerable package/ }))

    expect(onSelectArtifact).toHaveBeenCalledWith('artifact-1')
  })

  it('shows empty artifact hint when no artifacts are available', (): void => {
    render(
      <ContextRail
        artifacts={[]}
        currentExchangeMessageId="agent-1"
        isActivityDrawerExpanded={false}
        latestModernContext={null}
        mode="artifacts-only"
        onSelectArtifact={vi.fn()}
        onToggleActivityDrawer={vi.fn()}
        selectedArtifactId={null}
        toolLog={TOOL_LOG}
      />,
    )

    expect(screen.getByText('Artifacts will appear here.')).toBeInTheDocument()
  })

  it('opens and closes the topology placeholder overlay', (): void => {
    renderContextRail('stories+artifacts', buildModernContext(4))

    fireEvent.click(screen.getByRole('button', { name: 'View Full Topology' }))
    expect(screen.getByRole('dialog', { name: 'Full topology preview' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Full topology preview' })).not.toBeInTheDocument()
  })

  it('forwards story-card entity clicks with latest context message id', (): void => {
    const onEntityClick = vi.fn()

    render(
      <ContextRail
        artifacts={ARTIFACTS}
        currentExchangeMessageId="agent-9"
        isActivityDrawerExpanded={false}
        latestContextMessageId="agent-9"
        latestModernContext={buildModernContext(4)}
        mode="stories+artifacts"
        onEntityClick={onEntityClick}
        onSelectArtifact={vi.fn()}
        onToggleActivityDrawer={vi.fn()}
        selectedArtifactId={null}
        toolLog={TOOL_LOG}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Risk 0' }))

    expect(onEntityClick).toHaveBeenCalledWith(
      {
        type: 'risk',
        id: 'risk-0',
        name: 'Risk 0',
      },
      'agent-9',
    )
  })

  it('hides activity drawer when showActivityDrawer is false', (): void => {
    render(
      <ContextRail
        artifacts={ARTIFACTS}
        currentExchangeMessageId="agent-1"
        isActivityDrawerExpanded={false}
        latestModernContext={null}
        mode="artifacts-only"
        onSelectArtifact={vi.fn()}
        onToggleActivityDrawer={vi.fn()}
        selectedArtifactId={null}
        showActivityDrawer={false}
        toolLog={TOOL_LOG}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Activity summary' })).not.toBeInTheDocument()
  })

  it('renders fallback copy in entity-detail mode when panel content is not provided', (): void => {
    render(
      <ContextRail
        artifacts={ARTIFACTS}
        currentExchangeMessageId="agent-1"
        isActivityDrawerExpanded={false}
        latestModernContext={buildModernContext(4)}
        mode="entity-detail"
        onSelectArtifact={vi.fn()}
        onToggleActivityDrawer={vi.fn()}
        selectedArtifactId={null}
        toolLog={TOOL_LOG}
      />,
    )

    expect(screen.getByText('Select an entity to view details.')).toBeInTheDocument()
  })

  it('omits story section in stories mode when context has no story cards', (): void => {
    render(
      <ContextRail
        artifacts={ARTIFACTS}
        currentExchangeMessageId="agent-1"
        isActivityDrawerExpanded={false}
        latestModernContext={{
          storyCards: [],
          entityGraph: { nodes: [], edges: [] },
          vizHints: [],
          pivotTargets: [],
        }}
        mode="stories+artifacts"
        onSelectArtifact={vi.fn()}
        onToggleActivityDrawer={vi.fn()}
        selectedArtifactId={null}
        toolLog={TOOL_LOG}
      />,
    )

    expect(screen.queryByRole('heading', { name: 'Story cards' })).not.toBeInTheDocument()
  })
})
