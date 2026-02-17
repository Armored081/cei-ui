import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AttentionSection } from '../AttentionSection'
import { MetricsGlance } from '../MetricsGlance'
import { QuickStartGrid } from '../QuickStartGrid'
import type { HomeAgenticItem, HomeMetricItem } from '../mockFeedData'

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
    id: 'metric-1',
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
]

function ChatRouteDebug(): JSX.Element {
  const location = useLocation()

  return <div>{`Chat route ${location.search}`}</div>
}

describe('home keyboard navigation', (): void => {
  it('navigates to chat draft when Enter is pressed on an attention card', (): void => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AttentionSection items={ATTENTION_ITEMS} />} />
          <Route path="/chat" element={<ChatRouteDebug />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.keyDown(
      screen.getByRole('button', { name: /Immediate supplier exception review/i }),
      {
        key: 'Enter',
      },
    )

    expect(
      screen.getByText(
        `Chat route ?draft=${encodeURIComponent(
          'Tell me more about: Immediate supplier exception review. Two suppliers exceeded exposure thresholds overnight.',
        )}`,
      ),
    ).toBeInTheDocument()
  })

  it('navigates to chat draft when Enter is pressed on a metrics card', (): void => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MetricsGlance items={METRIC_ITEMS} />} />
          <Route path="/chat" element={<ChatRouteDebug />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.keyDown(screen.getByRole('button', { name: /OT findings count/i }), { key: 'Enter' })

    expect(
      screen.getByText(
        `Chat route ?draft=${encodeURIComponent(
          'Analyze the OT findings count metric which is currently 12',
        )}`,
      ),
    ).toBeInTheDocument()
  })

  it('navigates to chat draft when Enter is pressed on a quick start card', (): void => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<QuickStartGrid />} />
          <Route path="/chat" element={<ChatRouteDebug />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.keyDown(screen.getByRole('button', { name: /Risk Assessment/i }), { key: 'Enter' })

    expect(
      screen.getByText(
        `Chat route ?draft=${encodeURIComponent('Run a risk assessment for my organization')}`,
      ),
    ).toBeInTheDocument()
  })

  it('attention cards are focusable and expose button role', (): void => {
    render(
      <MemoryRouter>
        <AttentionSection items={ATTENTION_ITEMS} />
      </MemoryRouter>,
    )

    const card = screen.getByRole('button', { name: /Immediate supplier exception review/i })

    expect(card).toHaveAttribute('tabindex', '0')
  })

  it('metrics cards are focusable and expose button role', (): void => {
    render(
      <MemoryRouter>
        <MetricsGlance items={METRIC_ITEMS} />
      </MemoryRouter>,
    )

    const card = screen.getByRole('button', { name: /OT findings count/i })

    expect(card).toHaveAttribute('tabindex', '0')
  })

  it('quick start cards are focusable and expose button role', (): void => {
    render(
      <MemoryRouter>
        <QuickStartGrid />
      </MemoryRouter>,
    )

    const card = screen.getByRole('button', { name: /Risk Assessment/i })

    expect(card).toHaveAttribute('tabindex', '0')
  })

  it('all quick start cards expose button role', (): void => {
    render(
      <MemoryRouter>
        <QuickStartGrid />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('button')).toHaveLength(4)
  })
})
