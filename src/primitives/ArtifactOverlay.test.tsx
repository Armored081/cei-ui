import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { registerBuiltinArtifactTypes } from '../artifacts/registerBuiltinTypes'
import type { Artifact } from '../hooks/useChatEngine'
import { ArtifactOverlay } from './ArtifactOverlay'

registerBuiltinArtifactTypes()

function buildRecommendationArtifact(): Artifact {
  return {
    block: {
      body: 'Update dependency xyz to 3.2.1.',
      kind: 'recommendation',
      severity: 'medium',
      title: 'Patch vulnerable package',
    },
    confidence: 'high',
    confidenceDecay: '2026-02-12T08:00:00.000Z',
    reasoning:
      '**Patch urgency** was derived from exploitability and package exposure.\\n- CVE score > 8\\n- Public exploit available',
    id: 'artifact-1',
    kind: 'recommendation',
    segmentIndex: 1,
    sourceMessageId: 'agent-1',
    title: 'Patch vulnerable package',
  }
}

describe('ArtifactOverlay', (): void => {
  it('renders expanded artifact content and toolbar actions', (): void => {
    render(
      <ArtifactOverlay
        artifact={buildRecommendationArtifact()}
        onBack={vi.fn()}
        onClose={vi.fn()}
        onToggleFullScreen={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Expanded artifact: Patch vulnerable package' }),
    ).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Update dependency xyz to 3.2.1.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Why this recommendation?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to artifact list' })).toHaveFocus()
  })

  it('supports close and keyboard shortcuts', (): void => {
    const onBack = vi.fn()
    const onClose = vi.fn()
    const onToggleFullScreen = vi.fn()

    const { container } = render(
      <ArtifactOverlay
        artifact={buildRecommendationArtifact()}
        onBack={onBack}
        onClose={onClose}
        onToggleFullScreen={onToggleFullScreen}
      />,
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Expanded artifact: Patch vulnerable package',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Why this recommendation?' }))
    expect(screen.getByText('Patch urgency')).toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'f' })
    expect(onToggleFullScreen).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onBack).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close artifact view' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    const backdrop = container.querySelector('.cei-artifact-overlay-backdrop')
    if (!backdrop) {
      throw new Error('Expected overlay backdrop')
    }

    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
