import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EntityBadge } from '../EntityBadge.js'
import { ENTITY_TYPE_CONFIG } from '../entityTypeConfig.js'

describe('EntityBadge', (): void => {
  it('renders icon and label by default', (): void => {
    render(<EntityBadge type="control" />)

    expect(screen.getByText(ENTITY_TYPE_CONFIG.control.icon)).toBeInTheDocument()
    expect(screen.getByText('Control')).toBeInTheDocument()
  })

  it('renders icon only when showLabel is false', (): void => {
    render(<EntityBadge showLabel={false} type="risk" />)

    expect(screen.getByText(ENTITY_TYPE_CONFIG.risk.icon)).toBeInTheDocument()
    expect(screen.queryByText('Risk')).not.toBeInTheDocument()
  })

  it('applies color custom property from type config', (): void => {
    const { container } = render(<EntityBadge type="framework" />)
    const badge = container.querySelector('.entity-badge')

    expect(badge).not.toBeNull()
    expect(badge).toHaveStyle('--badge-color: var(--chart-series-3)')
  })
})
