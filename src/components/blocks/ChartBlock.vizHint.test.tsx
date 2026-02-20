import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChartBlock } from './ChartBlock.js'

const mockEnhancedChartBlock = vi.hoisted(() =>
  vi.fn(() => <div data-testid="enhanced-chart-block">enhanced</div>),
)
const mockStandardChartBlock = vi.hoisted(() =>
  vi.fn(() => <div data-testid="standard-chart-block">standard</div>),
)

vi.mock('../../viz/EnhancedChartBlock.js', () => ({
  EnhancedChartBlock: mockEnhancedChartBlock,
}))

vi.mock('./StandardChartBlock.js', async () => {
  const actual = await vi.importActual('./StandardChartBlock.js')

  return {
    ...actual,
    StandardChartBlock: mockStandardChartBlock,
  }
})

const BLOCK = {
  kind: 'chart' as const,
  chartType: 'bar' as const,
  title: 'Risk',
  data: [{ label: 'A', value: 1 }],
}

describe('ChartBlock vizHint integration', (): void => {
  it('delegates to EnhancedChartBlock when vizHint is provided', (): void => {
    render(
      <ChartBlock
        block={BLOCK}
        vizHint={{
          id: 'hint-1',
          chartType: 'gauge',
          title: 'Risk Gauge',
          data: {
            value: 42,
            max: 100,
            label: 'Risk',
          },
        }}
      />,
    )

    expect(screen.getByTestId('enhanced-chart-block')).toBeInTheDocument()
    expect(mockEnhancedChartBlock).toHaveBeenCalled()
  })

  it('renders StandardChartBlock when vizHint is absent', (): void => {
    render(<ChartBlock block={BLOCK} />)

    expect(screen.getByTestId('standard-chart-block')).toBeInTheDocument()
    expect(mockStandardChartBlock).toHaveBeenCalled()
  })
})
