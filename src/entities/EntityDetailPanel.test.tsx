import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { EntityReference, ModernContext } from '../types/modern-context.js'
import { EntityDetailPanel } from './EntityDetailPanel.js'

const ACTIVE_ENTITY: EntityReference = {
  type: 'risk',
  id: 'RS-9',
  name: 'Credential Abuse Risk',
  attributes: {
    description: 'Privileged account takeover risk in IAM workflows.',
    owner: 'Identity Team',
  },
}

function buildModernContext(): ModernContext {
  return {
    storyCards: [],
    entityGraph: {
      nodes: [
        ACTIVE_ENTITY,
        { type: 'control', id: 'AC-2', name: 'Account Management' },
        { type: 'policy', id: 'POL-7', name: 'Identity Policy' },
        { type: 'metric', id: 'MET-9', name: 'Failed Auth Rate' },
      ],
      edges: [
        {
          source: ACTIVE_ENTITY,
          target: { type: 'control', id: 'AC-2', name: 'Account Management' },
          relationshipType: 'mitigated-by',
        },
        {
          source: { type: 'policy', id: 'POL-7', name: 'Identity Policy' },
          target: ACTIVE_ENTITY,
          relationshipType: 'governs',
        },
      ],
    },
    vizHints: [],
    pivotTargets: [],
  }
}

function buildContextWithoutRelatedEdges(): ModernContext {
  return {
    storyCards: [],
    entityGraph: {
      nodes: [ACTIVE_ENTITY],
      edges: [],
    },
    vizHints: [],
    pivotTargets: [],
  }
}

describe('EntityDetailPanel', (): void => {
  it('renders overview attributes for the selected entity', (): void => {
    render(
      <EntityDetailPanel
        entity={ACTIVE_ENTITY}
        modernContext={buildModernContext()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Credential Abuse Risk' })).toBeInTheDocument()
    expect(screen.getByText('RS-9')).toBeInTheDocument()
    expect(screen.getAllByText('Privileged account takeover risk in IAM workflows.')).toHaveLength(
      2,
    )
    expect(screen.getByText('Identity Team')).toBeInTheDocument()
  })

  it('switches between Overview, Related, and Graph tabs', (): void => {
    render(
      <EntityDetailPanel
        entity={ACTIVE_ENTITY}
        modernContext={buildModernContext()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Related' }))
    expect(screen.getByRole('tabpanel', { name: 'Related' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Graph' }))
    expect(screen.getByRole('tabpanel', { name: 'Graph' })).toBeInTheDocument()
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })

  it('shows related entities derived from source and target graph edges', (): void => {
    render(
      <EntityDetailPanel
        entity={ACTIVE_ENTITY}
        modernContext={buildModernContext()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Related' }))

    expect(screen.getByText('Account Management')).toBeInTheDocument()
    expect(screen.getByText('Identity Policy')).toBeInTheDocument()
    expect(screen.getByText('mitigated-by (outgoing)')).toBeInTheDocument()
    expect(screen.getByText('governs (incoming)')).toBeInTheDocument()
  })

  it('invokes onClose when Close button is clicked', (): void => {
    const onClose = vi.fn()

    render(
      <EntityDetailPanel
        entity={ACTIVE_ENTITY}
        modernContext={buildModernContext()}
        onBack={vi.fn()}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('invokes onBack when Back to Artifacts is clicked', (): void => {
    const onBack = vi.fn()

    render(
      <EntityDetailPanel
        entity={ACTIVE_ENTITY}
        modernContext={buildModernContext()}
        onBack={onBack}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to Artifacts' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('shows empty related state when no matching edges exist', (): void => {
    render(
      <EntityDetailPanel
        entity={ACTIVE_ENTITY}
        modernContext={buildContextWithoutRelatedEdges()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Related' }))

    expect(screen.getByText('No related entities in this message context.')).toBeInTheDocument()
  })

  it('uses description placeholder when entity has no description attribute', (): void => {
    render(
      <EntityDetailPanel
        entity={{ type: 'risk', id: 'RS-10', name: 'Risk without description' }}
        modernContext={buildModernContext()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Description coming soon.')).toBeInTheDocument()
  })

  it('hides attributes list when entity has no attributes', (): void => {
    render(
      <EntityDetailPanel
        entity={{ type: 'risk', id: 'RS-11', name: 'Risk without attributes' }}
        modernContext={buildModernContext()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders fallback panel when entity type is invalid at runtime', (): void => {
    render(
      <EntityDetailPanel
        entity={{ type: 'invalid', id: 'BAD', name: 'Bad Entity' } as unknown as EntityReference}
        modernContext={buildModernContext()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Entity detail unavailable')).toBeInTheDocument()
    expect(
      screen.getByText('Entity payload was invalid and could not be rendered.'),
    ).toBeInTheDocument()
  })

  it('shows graph placeholder copy in Graph tab', (): void => {
    render(
      <EntityDetailPanel
        entity={ACTIVE_ENTITY}
        modernContext={buildModernContext()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Graph' }))

    expect(screen.getByText('Mini topology preview')).toBeInTheDocument()
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })
})
