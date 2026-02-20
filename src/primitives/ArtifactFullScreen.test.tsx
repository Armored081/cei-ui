import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { registerBuiltinArtifactTypes } from '../artifacts/registerBuiltinTypes'
import type { Artifact } from '../hooks/useChatEngine'
import { ArtifactFullScreen } from './ArtifactFullScreen'

registerBuiltinArtifactTypes()

function buildTableArtifact(): Artifact {
  return {
    block: {
      columns: ['service', 'severity'],
      kind: 'table',
      rows: [
        { service: 'auth', severity: 'high' },
        { service: 'storage', severity: 'medium' },
      ],
      title: 'Service Issues',
    },
    confidence: 'medium',
    confidenceDecay: '2026-02-10T10:00:00.000Z',
    reasoning: 'Prioritized by production impact and blast radius.',
    id: 'artifact-table-1',
    kind: 'table',
    segmentIndex: 1,
    sourceMessageId: 'agent-1',
    title: 'Service Issues',
  }
}

function buildChartArtifact(): Artifact {
  return {
    block: {
      chartType: 'bar',
      data: [
        { label: 'Identify', value: 12 },
        { label: 'Protect', value: 18 },
        { label: 'Detect', value: 9 },
      ],
      kind: 'chart',
      title: 'NIST CSF Coverage',
    },
    confidence: 'high',
    confidenceDecay: '2026-02-12T10:00:00.000Z',
    id: 'artifact-chart-1',
    kind: 'chart',
    segmentIndex: 2,
    sourceMessageId: 'agent-1',
    title: 'NIST CSF Coverage',
  }
}

describe('ArtifactFullScreen', (): void => {
  it('renders full-screen dialog and table controls', (): void => {
    render(
      <ArtifactFullScreen
        artifact={buildTableArtifact()}
        onBack={vi.fn()}
        onClose={vi.fn()}
        onEscape={vi.fn()}
        onToggleFullScreen={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Full-screen artifact: Service Issues' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter table rows')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Why this recommendation?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toHaveFocus()

    const minimizeBtn = screen.getByRole('button', { name: 'Minimize artifact view' })
    expect(minimizeBtn.className).toContain('cei-artifact-overlay-btn-fullscreen')

    const closeBtn = screen.getByRole('button', { name: 'Close artifact view' })
    expect(closeBtn.className).toContain('cei-artifact-overlay-btn-close')
    expect(closeBtn.textContent).toBe('✕')
  })

  it('handles toolbar and escape interactions', (): void => {
    const onBack = vi.fn()
    const onClose = vi.fn()
    const onEscape = vi.fn()
    const onToggleFullScreen = vi.fn()

    render(
      <ArtifactFullScreen
        artifact={buildTableArtifact()}
        onBack={onBack}
        onClose={onClose}
        onEscape={onEscape}
        onToggleFullScreen={onToggleFullScreen}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Why this recommendation?' }))
    expect(
      screen.getByText('Prioritized by production impact and blast radius.'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Minimize artifact view' }))
    expect(onToggleFullScreen).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close artifact view' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(
      screen.getByRole('dialog', { name: 'Full-screen artifact: Service Issues' }),
      {
        key: 'Escape',
      },
    )
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('renders chart artifacts with flex-based fullscreen sizing classes', (): void => {
    render(
      <ArtifactFullScreen
        artifact={buildChartArtifact()}
        onBack={vi.fn()}
        onClose={vi.fn()}
        onEscape={vi.fn()}
        onToggleFullScreen={vi.fn()}
      />,
    )

    const chartContainer = screen.getByTestId('chart-container')
    expect(chartContainer.getAttribute('style')).toBeNull()
    // Portal renders to document.body, not test container
    expect(
      document.querySelector(
        '.cei-artifact-fullscreen-content.cei-artifact-fullscreen-content-chart',
      ),
    ).toBeTruthy()
  })
})
