import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { MetricsGlance } from '../MetricsGlance'
import type { HomeMetricItem } from '../mockFeedData'

const METRIC_ITEMS: HomeMetricItem[] = [
  {
    id: 'metric-red-up',
    label: 'OT findings count',
    value: 12,
    valueDisplay: '12',
    previousValue: 10,
    threshold: {
      direction: 'above',
      amber: 8,
      red: 11,
    },
  },
  {
    id: 'metric-amber-down',
    label: 'Vendor coverage %',
    value: 84,
    valueDisplay: '84%',
    previousValue: 86,
    threshold: {
      direction: 'below',
      amber: 90,
      red: 80,
    },
  },
  {
    id: 'metric-green-flat',
    label: 'IT/OT segmentation %',
    value: 95,
    valueDisplay: '95%',
    previousValue: 95,
    threshold: {
      direction: 'below',
      amber: 90,
      red: 80,
    },
  },
]

function renderMetrics(items: HomeMetricItem[]): void {
  render(
    <MemoryRouter>
      <MetricsGlance items={items} />
    </MemoryRouter>,
  )
}

describe('MetricsGlance', (): void => {
  it('renders heading and all metric cards', (): void => {
    renderMetrics(METRIC_ITEMS)

    expect(screen.getByRole('heading', { name: 'Metrics at a Glance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /OT findings count/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Vendor coverage %/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /IT\/OT segmentation %/i })).toBeInTheDocument()
  })

  it('applies red, amber, and green threshold classes', (): void => {
    renderMetrics(METRIC_ITEMS)

    expect(screen.getByText('12')).toHaveClass('cei-home-metric-value-red')
    expect(screen.getByText('84%')).toHaveClass('cei-home-metric-value-amber')
    expect(screen.getByText('95%')).toHaveClass('cei-home-metric-value-green')
  })

  it('renders up, down, and flat trend arrows', (): void => {
    renderMetrics(METRIC_ITEMS)

    expect(screen.getByText('↑')).toBeInTheDocument()
    expect(screen.getByText('↓')).toBeInTheDocument()
    expect(screen.getByText('→')).toBeInTheDocument()
  })

  it('sets trend direction labels for assistive technology', (): void => {
    renderMetrics(METRIC_ITEMS)

    expect(screen.getByLabelText('Trend up')).toBeInTheDocument()
    expect(screen.getByLabelText('Trend down')).toBeInTheDocument()
    expect(screen.getByLabelText('Trend flat')).toBeInTheDocument()
  })

  it('renders empty state when no metrics are provided', (): void => {
    renderMetrics([])

    expect(screen.getByText('No metrics available yet')).toBeInTheDocument()
  })

  it('navigates to chat when a metric card is clicked', (): void => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MetricsGlance items={METRIC_ITEMS} />} />
          <Route path="/chat" element={<div>Chat route</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /OT findings count/i }))

    expect(screen.getByText('Chat route')).toBeInTheDocument()
  })

  it('treats values below red threshold as red for below-direction metrics', (): void => {
    const belowRedItem: HomeMetricItem[] = [
      {
        id: 'metric-below-red',
        label: 'Critical SLA adherence %',
        value: 68,
        valueDisplay: '68%',
        previousValue: 72,
        threshold: {
          direction: 'below',
          amber: 90,
          red: 75,
        },
      },
    ]

    renderMetrics(belowRedItem)

    expect(screen.getByText('68%')).toHaveClass('cei-home-metric-value-red')
  })
})
