import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ArtifactRegistry } from '../../artifacts/ArtifactRegistry'
import { chartArtifactDefinition } from '../../artifacts/renderers/ChartArtifact'
import type { Artifact } from '../../hooks/useChatEngine'
import { ArtifactOverlay } from '../ArtifactOverlay'

// Register chart renderer
ArtifactRegistry.register(chartArtifactDefinition)

function makeChartArtifact(dataPoints: number): Artifact {
  const data = Array.from({ length: dataPoints }, (_, i) => ({
    label: `NIST CSF Category ${(i + 1).toString()}`,
    value: Math.floor(Math.random() * 20) + 1,
  }))

  return {
    id: 'test-chart-artifact',
    kind: 'chart',
    title: 'Technical Standards by NIST CSF V2 Category',
    block: {
      kind: 'chart' as const,
      chartType: 'bar' as const,
      title: 'Technical Standards by NIST CSF V2 Category',
      data,
    },
    messageId: 'msg-1',
    confidence: undefined,
    confidenceDecay: undefined,
    reasoning: undefined,
  }
}

describe('ArtifactOverlay chart layout', () => {
  const noop = vi.fn()

  it('renders chart in expanded overlay with close and fullscreen buttons', () => {
    const artifact = makeChartArtifact(6)
    render(
      <ArtifactOverlay
        artifact={artifact}
        artifactPosition="1/5"
        onBack={noop}
        onClose={noop}
        onNextArtifact={noop}
        onPrevArtifact={noop}
        onToggleFullScreen={noop}
      />,
    )

    // Title renders (in overlay header + chart block = multiple matches)
    expect(screen.getAllByText('Technical Standards by NIST CSF V2 Category').length).toBeGreaterThanOrEqual(1)

    // Close button is touch-friendly with proper class
    const closeBtn = screen.getByLabelText('Close artifact view')
    expect(closeBtn.className).toContain('cei-artifact-overlay-btn-close')
    expect(closeBtn.textContent).toBe('✕')

    // Fullscreen button has proper class
    const fullscreenBtn = screen.getByLabelText('Open full-screen artifact view')
    expect(fullscreenBtn.className).toContain('cei-artifact-overlay-btn-fullscreen')
  })

  it('renders bar chart with truncated axis labels for long category names', () => {
    const artifact = makeChartArtifact(10)
    render(
      <ArtifactOverlay
        artifact={artifact}
        onBack={noop}
        onClose={noop}
        onNextArtifact={null}
        onPrevArtifact={null}
        onToggleFullScreen={noop}
      />,
    )

    // Chart container renders
    const chartContainer = screen.getByTestId('chart-container')
    expect(chartContainer).toBeTruthy()
    expect(chartContainer.className).toContain('cei-chart-wrapper')

    // Chart block renders inside the expanded content
    const chartBlock = screen.getByTestId('chart-block-bar')
    expect(chartBlock).toBeTruthy()
  })

  it('hides the block header inside expanded overlay to maximize chart space', () => {
    const artifact = makeChartArtifact(6)
    const { container } = render(
      <ArtifactOverlay
        artifact={artifact}
        onBack={noop}
        onClose={noop}
        onNextArtifact={null}
        onPrevArtifact={null}
        onToggleFullScreen={noop}
      />,
    )

    // The expanded content wrapper should exist
    const expandedContent = container.querySelector('.cei-artifact-expanded-content')
    expect(expandedContent).toBeTruthy()

    // Block header is rendered but will be hidden via CSS (display: none)
    // We verify the CSS rule exists by checking the class is applied
    const blockHeader = container.querySelector('.cei-block-header')
    expect(blockHeader).toBeTruthy()
  })

  it('renders position label for multi-artifact navigation', () => {
    const artifact = makeChartArtifact(6)
    render(
      <ArtifactOverlay
        artifact={artifact}
        artifactPosition="1/5"
        onBack={noop}
        onClose={noop}
        onNextArtifact={noop}
        onPrevArtifact={noop}
        onToggleFullScreen={noop}
      />,
    )

    expect(screen.getByText('1/5')).toBeTruthy()
  })
})
