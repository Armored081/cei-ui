import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { MetricsGlance } from '../MetricsGlance'
import type { HomeMetricItem } from '../types'

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

interface RenderMetricsOptions {
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

function renderMetrics(items: HomeMetricItem[], options: RenderMetricsOptions = {}): void {
  render(
    <MemoryRouter>
      <MetricsGlance
        items={items}
        loading={options.loading}
        error={options.error}
        onRetry={options.onRetry}
      />
    </MemoryRouter>,
  )
}

function ChatRouteDebug(): JSX.Element {
  const location = useLocation()
  return <div>{`Chat route ${location.search}`}</div>
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

    expect(screen.getByText('12')).toHaveClass('cei-metric-value--red')
    expect(screen.getByText('84%')).toHaveClass('cei-metric-value--amber')
    expect(screen.getByText('95%')).toHaveClass('cei-metric-value--green')
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

  it('renders loading skeleton cards when loading is true', (): void => {
    const { container } = render(
      <MemoryRouter>
        <MetricsGlance items={METRIC_ITEMS} loading />
      </MemoryRouter>,
    )

    expect(container.querySelectorAll('.cei-home-metric-card--skeleton')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /OT findings count/i })).not.toBeInTheDocument()
  })

  it('renders error state and triggers retry callback', (): void => {
    const onRetry = vi.fn()
    renderMetrics(METRIC_ITEMS, {
      error: 'Failed to load metrics',
      onRetry,
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load metrics')

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('navigates to chat with draft param when a metric card is clicked', (): void => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MetricsGlance items={METRIC_ITEMS} />} />
          <Route path="/chat" element={<ChatRouteDebug />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /OT findings count/i }))

    expect(
      screen.getByText(
        `Chat route ?draft=${encodeURIComponent(
          'Analyze the OT findings count metric which is currently 12',
        )}`,
      ),
    ).toBeInTheDocument()
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

    expect(screen.getByText('68%')).toHaveClass('cei-metric-value--red')
  })
})
