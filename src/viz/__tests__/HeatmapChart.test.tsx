import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HeatmapChart } from '../HeatmapChart.js'

const DATA = [
  { x: 'Mon', y: 'Critical', value: 8 },
  { x: 'Tue', y: 'Critical', value: 3 },
  { x: 'Mon', y: 'High', value: 5 },
  { x: 'Tue', y: 'High', value: 1 },
]

describe('HeatmapChart', (): void => {
  it('renders grid cells for x/y combinations', (): void => {
    render(<HeatmapChart data={DATA} maxValue={10} />)

    expect(screen.getAllByTestId('heatmap-cell')).toHaveLength(4)
  })

  it('renders axis labels', (): void => {
    render(<HeatmapChart data={DATA} maxValue={10} />)

    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('shows tooltip on hover', (): void => {
    render(<HeatmapChart data={DATA} maxValue={10} />)

    fireEvent.mouseEnter(screen.getAllByTestId('heatmap-cell')[0])

    expect(screen.getByRole('status')).toHaveTextContent('Critical')
    expect(screen.getByRole('status')).toHaveTextContent('Mon')
    expect(screen.getByRole('status')).toHaveTextContent('Value: 8')
  })

  it('renders an empty state when no data exists', (): void => {
    render(<HeatmapChart data={[]} maxValue={1} />)

    expect(screen.getByText('No heatmap data available.')).toBeInTheDocument()
  })

  it('applies higher intensity for larger values', (): void => {
    const { container } = render(<HeatmapChart data={DATA} maxValue={10} />)

    const cells = container.querySelectorAll('rect[data-testid="heatmap-cell"]')
    const highFill = cells[0].getAttribute('fill')
    const lowFill = cells[cells.length - 1].getAttribute('fill')

    expect(highFill).not.toBe(lowFill)
  })
})
