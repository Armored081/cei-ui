import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { EntityGraph } from '../../types/modern-context.js'
import { EntityRelationshipMatrix } from '../EntityRelationshipMatrix.js'

function buildGraph(): EntityGraph {
  const riskA = { type: 'risk' as const, id: 'risk-a', name: 'Risk A' }
  const riskB = { type: 'risk' as const, id: 'risk-b', name: 'Risk B' }
  const control = { type: 'control' as const, id: 'control-1', name: 'Control 1' }

  return {
    nodes: [riskA, riskB, control],
    edges: [
      { source: riskA, target: control, relationshipType: 'mitigated_by' },
      { source: riskB, target: riskA, relationshipType: 'correlates_with' },
      { source: control, target: riskB, relationshipType: 'depends_on' },
    ],
  }
}

describe('EntityRelationshipMatrix', (): void => {
  it('renders table rows for each relationship edge', (): void => {
    render(<EntityRelationshipMatrix graph={buildGraph()} />)

    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('sorts rows by relationship type', (): void => {
    render(<EntityRelationshipMatrix graph={buildGraph()} />)

    const relationshipCells = screen.getAllByRole('cell').filter((_, index) => index % 3 === 1)
    expect(relationshipCells.map((cell) => cell.textContent)).toEqual([
      'correlates_with',
      'depends_on',
      'mitigated_by',
    ])
  })

  it('makes source and target entity names clickable', (): void => {
    const onEntityClick = vi.fn()

    render(<EntityRelationshipMatrix graph={buildGraph()} onEntityClick={onEntityClick} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Risk A' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Control 1' })[0])

    expect(onEntityClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'risk-a',
      }),
    )
    expect(onEntityClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'control-1',
      }),
    )
  })

  it('renders table headers', (): void => {
    render(<EntityRelationshipMatrix graph={buildGraph()} />)

    expect(screen.getByRole('columnheader', { name: 'Source Entity' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Relationship' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Target Entity' })).toBeInTheDocument()
  })

  it('handles empty graphs', (): void => {
    render(
      <EntityRelationshipMatrix
        graph={{
          nodes: [],
          edges: [],
        }}
      />,
    )

    expect(screen.getByText('No entity relationships to display.')).toBeInTheDocument()
  })
})
