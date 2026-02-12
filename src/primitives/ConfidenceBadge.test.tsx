import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfidenceBadge } from './ConfidenceBadge'

describe('ConfidenceBadge', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-12T12:00:00.000Z'))
  })

  afterEach((): void => {
    vi.useRealTimers()
  })

  it('renders high, medium, and low confidence labels', (): void => {
    const { rerender } = render(<ConfidenceBadge confidence="high" />)

    expect(screen.getByText('High')).toHaveClass('cei-confidence-label')

    rerender(<ConfidenceBadge confidence="medium" />)
    expect(screen.getByText('Medium')).toHaveClass('cei-confidence-label')

    rerender(<ConfidenceBadge confidence="low" />)
    expect(screen.getByText('Low')).toHaveClass('cei-confidence-label')
  })

  it('renders decay information and stale warning after 24 hours', (): void => {
    render(<ConfidenceBadge confidence="medium" confidenceDecay="2026-02-10T08:00:00.000Z" />)

    expect(screen.getByLabelText('Confidence age 2d ago')).toBeInTheDocument()

    const warning = screen.getByLabelText('Confidence may have changed')
    expect(warning).toBeInTheDocument()
    expect(warning).toHaveAttribute('title', 'Confidence may have changed')
  })
})
