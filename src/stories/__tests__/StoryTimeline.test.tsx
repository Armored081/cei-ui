import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StoryTimeline } from '../StoryTimeline.js'

describe('StoryTimeline', (): void => {
  it('renders temporal window labels when window is present', (): void => {
    render(
      <StoryTimeline
        temporalWindow={{
          startDate: '2026-01-01',
          endDate: '2026-01-08',
        }}
      />,
    )

    expect(screen.getByText('Jan 1, 2026')).toBeInTheDocument()
    expect(screen.getByText('Jan 8, 2026')).toBeInTheDocument()
  })

  it('renders a descriptive aria label for accessibility', (): void => {
    render(
      <StoryTimeline
        temporalWindow={{
          startDate: '2026-02-10',
          endDate: '2026-02-11',
        }}
      />,
    )

    expect(
      screen.getByLabelText('Temporal window from Feb 10, 2026 to Feb 11, 2026'),
    ).toBeInTheDocument()
  })

  it('falls back to raw date values when parsing fails', (): void => {
    render(
      <StoryTimeline
        temporalWindow={{
          startDate: 'bad-date',
          endDate: 'also-bad',
        }}
      />,
    )

    expect(screen.getByText('bad-date')).toBeInTheDocument()
    expect(screen.getByText('also-bad')).toBeInTheDocument()
  })

  it('renders empty state when temporal window is missing', (): void => {
    render(<StoryTimeline />)

    expect(screen.getByText('No temporal window')).toBeInTheDocument()
  })

  it('applies severity-specific timeline color variable', (): void => {
    render(
      <StoryTimeline
        severity="critical"
        temporalWindow={{
          startDate: '2026-01-01',
          endDate: '2026-01-02',
        }}
      />,
    )

    expect(screen.getByLabelText('Temporal window from Jan 1, 2026 to Jan 2, 2026')).toHaveStyle(
      '--story-timeline-color: var(--severity-critical)',
    )
  })
})
