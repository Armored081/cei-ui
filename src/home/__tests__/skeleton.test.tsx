import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AttentionSection } from '../AttentionSection'
import { MetricsGlance } from '../MetricsGlance'
import type { HomeAgenticItem, HomeMetricItem } from '../types'

const ATTENTION_ITEMS: HomeAgenticItem[] = [
  {
    id: 'attention-1',
    severity: 'red',
    title: 'Immediate supplier exception review',
    summary: 'Two suppliers exceeded exposure thresholds overnight.',
    confidence: 'high',
  },
]

const METRIC_ITEMS: HomeMetricItem[] = [
  {
    id: 'metric-red',
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
    id: 'metric-amber',
    label: 'Open findings count',
    value: 9,
    valueDisplay: '9',
    previousValue: 11,
    threshold: {
      direction: 'above',
      amber: 8,
      red: 11,
    },
  },
  {
    id: 'metric-green',
    label: 'Resolved findings count',
    value: 6,
    valueDisplay: '6',
    previousValue: 6,
    threshold: {
      direction: 'above',
      amber: 8,
      red: 11,
    },
  },
]

describe('home skeleton and error states', (): void => {
  it('renders 3 attention skeleton cards when loading is true', (): void => {
    const { container } = render(
      <MemoryRouter>
        <AttentionSection items={ATTENTION_ITEMS} loading />
      </MemoryRouter>,
    )

    expect(container.querySelectorAll('.cei-home-attention-card--skeleton')).toHaveLength(3)
  })

  it('does not render attention item cards while loading', (): void => {
    render(
      <MemoryRouter>
        <AttentionSection items={ATTENTION_ITEMS} loading />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole('button', { name: /Immediate supplier exception review/i }),
    ).not.toBeInTheDocument()
  })

  it('renders attention error text when error is set', (): void => {
    render(
      <MemoryRouter>
        <AttentionSection items={ATTENTION_ITEMS} error="Unable to load attention items" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load attention items')
  })

  it('calls attention retry callback when Try again is clicked', (): void => {
    const onRetry = vi.fn()

    render(
      <MemoryRouter>
        <AttentionSection
          items={ATTENTION_ITEMS}
          error="Unable to load attention items"
          onRetry={onRetry}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not show attention retry button when onRetry is missing', (): void => {
    render(
      <MemoryRouter>
        <AttentionSection items={ATTENTION_ITEMS} error="Unable to load attention items" />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('renders 3 metric skeleton cards when loading is true', (): void => {
    const { container } = render(
      <MemoryRouter>
        <MetricsGlance items={METRIC_ITEMS} loading />
      </MemoryRouter>,
    )

    expect(container.querySelectorAll('.cei-home-metric-card--skeleton')).toHaveLength(3)
  })

  it('renders metric error text when error is set', (): void => {
    render(
      <MemoryRouter>
        <MetricsGlance items={METRIC_ITEMS} error="Unable to load metrics" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load metrics')
  })

  it('calls metric retry callback when Try again is clicked', (): void => {
    const onRetry = vi.fn()

    render(
      <MemoryRouter>
        <MetricsGlance items={METRIC_ITEMS} error="Unable to load metrics" onRetry={onRetry} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('applies red, amber, and green threshold classes', (): void => {
    render(
      <MemoryRouter>
        <MetricsGlance items={METRIC_ITEMS} />
      </MemoryRouter>,
    )

    expect(screen.getByText('12')).toHaveClass('cei-metric-value--red')
    expect(screen.getByText('9')).toHaveClass('cei-metric-value--amber')
    expect(screen.getByText('6')).toHaveClass('cei-metric-value--green')
  })

  it('renders trend arrow up when value is above previous', (): void => {
    render(
      <MemoryRouter>
        <MetricsGlance items={[METRIC_ITEMS[0]]} />
      </MemoryRouter>,
    )

    expect(screen.getByText('↑')).toBeInTheDocument()
  })

  it('renders trend arrow down when value is below previous', (): void => {
    render(
      <MemoryRouter>
        <MetricsGlance items={[METRIC_ITEMS[1]]} />
      </MemoryRouter>,
    )

    expect(screen.getByText('↓')).toBeInTheDocument()
  })

  it('renders trend arrow neutral when value equals previous', (): void => {
    render(
      <MemoryRouter>
        <MetricsGlance items={[METRIC_ITEMS[2]]} />
      </MemoryRouter>,
    )

    expect(screen.getByText('→')).toBeInTheDocument()
  })
})
