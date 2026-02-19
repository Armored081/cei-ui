import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MetricsPage } from '../MetricsPage'

describe('MetricsPage', (): void => {
  it('renders the metrics placeholder content', (): void => {
    render(<MetricsPage />)

    expect(screen.getByRole('heading', { name: 'Metrics Explorer' })).toBeInTheDocument()
    expect(
      screen.getByText('Deep-dive into security metrics across all domains.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Coming Soon' })).toBeInTheDocument()
    expect(
      screen.getByText(/full metric catalog with trends, threshold tracking, and domain-aware/i),
    ).toBeInTheDocument()
  })
})
