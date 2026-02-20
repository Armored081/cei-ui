import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StorySeverityBadge } from '../StorySeverityBadge.js'

describe('StorySeverityBadge', (): void => {
  it('renders critical severity', (): void => {
    render(<StorySeverityBadge severity="critical" />)

    expect(screen.getByText('Critical')).toHaveClass('cei-story-severity-badge-critical')
  })

  it('renders high severity', (): void => {
    render(<StorySeverityBadge severity="high" />)

    expect(screen.getByText('High')).toHaveClass('cei-story-severity-badge-high')
  })

  it('renders medium severity', (): void => {
    render(<StorySeverityBadge severity="medium" />)

    expect(screen.getByText('Medium')).toHaveClass('cei-story-severity-badge-medium')
  })

  it('renders low severity', (): void => {
    render(<StorySeverityBadge severity="low" />)

    expect(screen.getByText('Low')).toHaveClass('cei-story-severity-badge-low')
  })

  it('renders info severity', (): void => {
    render(<StorySeverityBadge severity="info" />)

    expect(screen.getByText('Info')).toHaveClass('cei-story-severity-badge-info')
  })
})
