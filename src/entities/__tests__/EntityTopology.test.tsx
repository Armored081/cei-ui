import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { EntityGraph } from '../../types/modern-context.js'
import { EntityTopology } from '../EntityTopology.js'

function buildGraph(): EntityGraph {
  const risk = {
    type: 'risk' as const,
    id: 'risk-1',
    name: 'Risk 1',
    attributes: {
      owner: 'Security',
      score: 92,
    },
  }

  const control = {
    type: 'control' as const,
    id: 'control-1',
    name: 'Control 1',
  }

  return {
    nodes: [risk, control],
    edges: [
      {
        source: risk,
        target: control,
        relationshipType: 'mitigated_by',
      },
    ],
  }
}

describe('EntityTopology', (): void => {
  it('renders nodes and edges from the graph', (): void => {
    render(<EntityTopology graph={buildGraph()} />)

    expect(screen.getAllByTestId('entity-topology-node')).toHaveLength(2)
    expect(screen.getAllByTestId('entity-topology-edge')).toHaveLength(1)
  })

  it('calls onNodeClick when a node is clicked', (): void => {
    const onNodeClick = vi.fn()

    render(<EntityTopology graph={buildGraph()} onNodeClick={onNodeClick} />)

    fireEvent.click(screen.getAllByTestId('entity-topology-node')[0])

    expect(onNodeClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'risk-1',
        name: 'Risk 1',
      }),
    )
  })

  it('shows a tooltip when hovering a node', (): void => {
    const { container } = render(<EntityTopology graph={buildGraph()} />)

    const firstNodeCircle = container.querySelector('circle[data-node-circle="true"]')

    if (!firstNodeCircle) {
      throw new Error('Expected node circle to exist')
    }

    fireEvent.mouseEnter(firstNodeCircle)

    expect(screen.getByRole('status')).toHaveTextContent('Risk 1')
    expect(screen.getByRole('status')).toHaveTextContent('owner: Security')
  })

  it('renders relationship labels', (): void => {
    render(<EntityTopology graph={buildGraph()} />)

    expect(screen.getByText('mitigated_by')).toBeInTheDocument()
  })

  it('handles empty graphs', (): void => {
    render(
      <EntityTopology
        graph={{
          nodes: [],
          edges: [],
        }}
      />,
    )

    expect(screen.getByText('No entities available for topology.')).toBeInTheDocument()
  })

  it('renders with custom dimensions', (): void => {
    const { container } = render(<EntityTopology graph={buildGraph()} height={480} width={900} />)

    const svg = container.querySelector('svg')

    expect(svg).toHaveAttribute('width', '900')
    expect(svg).toHaveAttribute('height', '480')
  })
})
