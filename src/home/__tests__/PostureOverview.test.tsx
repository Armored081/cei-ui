import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PostureOverview } from '../PostureOverview'

describe('PostureOverview', (): void => {
  it('renders heading and default posture domain labels', (): void => {
    render(<PostureOverview />)

    expect(screen.getByRole('heading', { name: 'Posture Overview' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'R&C gauge' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'VM gauge' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'DR gauge' })).toBeInTheDocument()
  })

  it('renders default posture percentages', (): void => {
    render(<PostureOverview />)

    expect(screen.getByText('78%')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('62%')).toBeInTheDocument()
  })

  it('renders skeleton cards while loading', (): void => {
    const { container } = render(<PostureOverview loading />)

    expect(container.querySelectorAll('.cei-home-posture-card--skeleton')).toHaveLength(3)
  })

  it('does not render gauge charts while loading', (): void => {
    const { container } = render(<PostureOverview loading />)

    expect(container.querySelectorAll('[data-testid="gauge-chart"]')).toHaveLength(0)
  })

  it('renders empty state when no posture domains are provided', (): void => {
    render(<PostureOverview domains={[]} />)

    expect(screen.getByText('Posture scores are not available yet')).toBeInTheDocument()
  })

  it('renders custom domain gauges when domains prop is set', (): void => {
    const { container } = render(
      <PostureOverview
        domains={[
          { id: 'custom-1', label: 'IAM', score: 91 },
          { id: 'custom-2', label: 'OT', score: 54 },
        ]}
      />,
    )

    expect(container.querySelectorAll('[data-testid="gauge-chart"]')).toHaveLength(2)
    expect(screen.getByRole('img', { name: 'IAM gauge' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'OT gauge' })).toBeInTheDocument()
  })

  it('clamps custom domain values above max in the rendered gauge', (): void => {
    render(<PostureOverview domains={[{ id: 'custom-1', label: 'IAM', score: 180 }]} />)

    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('renders a single gauge when one domain is supplied', (): void => {
    const { container } = render(
      <PostureOverview domains={[{ id: 'custom-1', label: 'IAM', score: 72 }]} />,
    )

    expect(container.querySelectorAll('[data-testid="gauge-chart"]')).toHaveLength(1)
  })
})
