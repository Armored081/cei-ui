import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TimelineChart } from '../TimelineChart.js'

const EVENTS = [
  { timestamp: '2026-02-01T00:00:00.000Z', label: 'Scan started' },
  { timestamp: '2026-02-02T00:00:00.000Z', label: 'Anomaly detected', severity: 'medium' },
  { timestamp: '2026-02-03T00:00:00.000Z', label: 'Containment', severity: 'high' },
]

describe('TimelineChart', (): void => {
  it('renders event dots for each timeline item', (): void => {
    render(<TimelineChart events={EVENTS} />)

    expect(screen.getAllByTestId('timeline-event-dot')).toHaveLength(3)
  })

  it('renders event labels', (): void => {
    render(<TimelineChart events={EVENTS} />)

    expect(screen.getByText('Scan started')).toBeInTheDocument()
    expect(screen.getByText('Containment')).toBeInTheDocument()
  })

  it('shows tooltip on hover', (): void => {
    render(<TimelineChart events={EVENTS} />)

    const dots = screen.getAllByTestId('timeline-event-dot')
    fireEvent.mouseEnter(dots[1])

    expect(screen.getByRole('status')).toHaveTextContent('Anomaly detected')
    expect(screen.getByRole('status')).toHaveTextContent('2026-02-02T00:00:00.000Z')
  })

  it('supports empty event arrays', (): void => {
    render(<TimelineChart events={[]} />)

    expect(screen.getByText('No timeline events available.')).toBeInTheDocument()
  })

  it('ignores malformed timestamps and gracefully degrades', (): void => {
    render(
      <TimelineChart
        events={[
          { timestamp: 'not-a-date', label: 'Bad' },
          { timestamp: '2026-02-03T00:00:00.000Z', label: 'Good' },
        ]}
      />,
    )

    expect(screen.getAllByTestId('timeline-event-dot')).toHaveLength(1)
    expect(screen.getByText('Good')).toBeInTheDocument()
  })
})
