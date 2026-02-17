import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AttentionSection } from '../AttentionSection'
import type { HomeAgenticItem } from '../mockFeedData'

const ATTENTION_ITEMS: HomeAgenticItem[] = [
  {
    id: 'attention-1',
    severity: 'red',
    title: 'Immediate supplier exception review',
    summary: 'Two suppliers exceeded exposure thresholds overnight.',
    confidence: 'high',
  },
  {
    id: 'attention-2',
    severity: 'amber',
    title: 'Monthly controls review needs approval',
    summary: 'The operating review pack has unresolved findings in scope.',
    confidence: 'medium',
  },
]

interface RenderAttentionOptions {
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

function renderAttention(items: HomeAgenticItem[], options: RenderAttentionOptions = {}): void {
  render(
    <MemoryRouter>
      <AttentionSection
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

describe('AttentionSection', (): void => {
  it('renders section heading and all attention cards', (): void => {
    renderAttention(ATTENTION_ITEMS)

    expect(screen.getByRole('heading', { name: 'Attention Needed' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Immediate supplier exception review/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Monthly controls review needs approval/i }),
    ).toBeInTheDocument()
  })

  it('renders confidence badges for each attention item', (): void => {
    renderAttention(ATTENTION_ITEMS)

    expect(screen.getByLabelText('Confidence High')).toBeInTheDocument()
    expect(screen.getByLabelText('Confidence Medium')).toBeInTheDocument()
  })

  it('renders empty state when there are no attention items', (): void => {
    renderAttention([])

    expect(screen.getByText('All clear — no urgent items right now')).toBeInTheDocument()
  })

  it('renders loading skeleton cards when loading is true', (): void => {
    const { container } = render(
      <MemoryRouter>
        <AttentionSection items={ATTENTION_ITEMS} loading />
      </MemoryRouter>,
    )

    expect(container.querySelectorAll('.cei-home-attention-card--skeleton')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Immediate supplier/i })).not.toBeInTheDocument()
  })

  it('renders error state and calls onRetry', (): void => {
    const onRetry = vi.fn()
    renderAttention(ATTENTION_ITEMS, {
      error: 'Unable to load home feed',
      onRetry,
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load home feed')

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('navigates to chat with an encoded draft when an attention card is clicked', (): void => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AttentionSection items={ATTENTION_ITEMS} />} />
          <Route path="/chat" element={<ChatRouteDebug />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Immediate supplier exception review/i }))

    expect(
      screen.getByText(
        `Chat route ?draft=${encodeURIComponent(
          'Tell me more about: Immediate supplier exception review. Two suppliers exceeded exposure thresholds overnight.',
        )}`,
      ),
    ).toBeInTheDocument()
  })

  it('applies red and amber severity classes to indicator dots', (): void => {
    const { container } = render(
      <MemoryRouter>
        <AttentionSection items={ATTENTION_ITEMS} />
      </MemoryRouter>,
    )

    expect(container.querySelectorAll('.cei-home-severity-dot-red')).toHaveLength(1)
    expect(container.querySelectorAll('.cei-home-severity-dot-amber')).toHaveLength(1)
  })
})
