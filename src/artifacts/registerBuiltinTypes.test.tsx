import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Artifact } from '../hooks/useChatEngine.js'
import { entityGraphSchema, vizHintSchema } from '../types/modern-context.js'
import { ArtifactRegistry } from './ArtifactRegistry.js'
import { registerBuiltinArtifactTypes } from './registerBuiltinTypes.js'

registerBuiltinArtifactTypes()

function buildVizHintArtifact(): Artifact {
  const hint = vizHintSchema.parse({
    id: 'hint-1',
    chartType: 'gauge',
    title: 'Risk Gauge',
    data: {
      value: 55,
      max: 100,
      label: 'Risk',
      severity: 'high',
    },
  })

  return {
    id: 'artifact-viz-1',
    sourceMessageId: 'agent-1',
    segmentIndex: 0,
    kind: 'viz-hint',
    title: 'Risk Gauge',
    block: hint as unknown as Artifact['block'],
  }
}

function buildEntityGraphArtifact(nodeCount = 2): Artifact {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    type: 'risk' as const,
    id: `risk-${index.toString()}`,
    name: `Risk ${index.toString()}`,
  }))

  const edges = nodes.slice(1).map((node, index) => ({
    source: nodes[index],
    target: node,
    relationshipType: index % 2 === 0 ? 'correlates_with' : 'mitigated_by',
  }))

  const graph = entityGraphSchema.parse({
    nodes,
    edges,
  })

  return {
    id: `artifact-graph-${nodeCount.toString()}`,
    sourceMessageId: 'agent-1',
    segmentIndex: 1,
    kind: 'entity-graph',
    title: 'Entity Graph',
    block: graph as unknown as Artifact['block'],
  }
}

describe('registerBuiltinArtifactTypes Phase 5 registrations', (): void => {
  it('registers viz-hint and entity-graph artifact kinds', (): void => {
    expect(ArtifactRegistry.has('viz-hint')).toBe(true)
    expect(ArtifactRegistry.has('entity-graph')).toBe(true)
  })

  it('renders VizHintArtifact in expanded mode', (): void => {
    const definition = ArtifactRegistry.get('viz-hint')

    if (!definition) {
      throw new Error('Expected viz-hint definition to be registered')
    }

    render(definition.renderExpanded(buildVizHintArtifact()))

    expect(screen.getByTestId('gauge-chart')).toBeInTheDocument()
  })

  it('renders VizHintArtifact in inline and fullscreen modes', (): void => {
    const definition = ArtifactRegistry.get('viz-hint')

    if (!definition) {
      throw new Error('Expected viz-hint definition to be registered')
    }

    const inlineView = render(definition.renderInline(buildVizHintArtifact()))
    expect(screen.getByText('Visualization')).toBeInTheDocument()
    inlineView.unmount()

    render(definition.renderFullScreen(buildVizHintArtifact()))
    expect(screen.getByTestId('gauge-chart')).toBeInTheDocument()
  })

  it('renders EntityGraphArtifact topology for smaller graphs', (): void => {
    const definition = ArtifactRegistry.get('entity-graph')

    if (!definition) {
      throw new Error('Expected entity-graph definition to be registered')
    }

    render(definition.renderExpanded(buildEntityGraphArtifact(4)))

    expect(screen.getByTestId('entity-topology')).toBeInTheDocument()
  })

  it('falls back to relationship matrix for complex graphs', (): void => {
    const definition = ArtifactRegistry.get('entity-graph')

    if (!definition) {
      throw new Error('Expected entity-graph definition to be registered')
    }

    render(definition.renderExpanded(buildEntityGraphArtifact(55)))

    expect(screen.getByTestId('entity-relationship-matrix')).toBeInTheDocument()
  })
})
