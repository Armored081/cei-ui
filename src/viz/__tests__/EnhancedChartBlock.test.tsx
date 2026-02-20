import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { StructuredBlock } from '../../agent/types.js'
import type { VizHint } from '../../types/modern-context.js'
import { EnhancedChartBlock } from '../EnhancedChartBlock.js'

const mockStandardChartBlock = vi.hoisted(() =>
  vi.fn(() => <div data-testid="standard-chart">standard</div>),
)
const mockVizHintRenderer = vi.hoisted(() =>
  vi.fn(() => <div data-testid="viz-hint-renderer">viz</div>),
)

vi.mock('../../components/blocks/StandardChartBlock.js', async () => {
  const actual = await vi.importActual('../../components/blocks/StandardChartBlock.js')

  return {
    ...actual,
    StandardChartBlock: mockStandardChartBlock,
  }
})

vi.mock('../VizHintRenderer.js', () => ({
  VizHintRenderer: mockVizHintRenderer,
}))

function buildChartBlock(): Extract<StructuredBlock, { kind: 'chart' }> {
  return {
    kind: 'chart',
    chartType: 'bar',
    title: 'Risk by Team',
    data: [{ label: 'Team A', value: 3 }],
  }
}

function buildVizHint(): VizHint {
  return {
    id: 'hint-1',
    chartType: 'gauge',
    title: 'Risk Gauge',
    data: {
      value: 42,
      max: 100,
      label: 'Risk',
    },
  }
}

describe('EnhancedChartBlock', (): void => {
  it('uses VizHintRenderer when vizHint is present', (): void => {
    render(<EnhancedChartBlock block={buildChartBlock()} vizHint={buildVizHint()} />)

    expect(screen.getByTestId('viz-hint-renderer')).toBeInTheDocument()
    expect(mockVizHintRenderer).toHaveBeenCalled()
  })

  it('falls back to StandardChartBlock when vizHint is absent', (): void => {
    render(<EnhancedChartBlock block={buildChartBlock()} />)

    expect(screen.getByTestId('standard-chart')).toBeInTheDocument()
    expect(mockStandardChartBlock).toHaveBeenCalled()
  })

  it('returns null and warns for non-chart blocks', (): void => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((): void => {})

    const { container } = render(
      <EnhancedChartBlock
        block={{
          kind: 'table',
          title: 'Table',
          columns: ['name'],
          rows: [{ name: 'x' }],
        }}
        vizHint={buildVizHint()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(warnSpy).toHaveBeenCalled()
  })

  it('passes vizHint through to VizHintRenderer', (): void => {
    const hint = buildVizHint()

    render(<EnhancedChartBlock block={buildChartBlock()} vizHint={hint} />)

    expect(mockVizHintRenderer).toHaveBeenCalledWith(
      expect.objectContaining({
        hint,
      }),
      expect.anything(),
    )
  })
})
