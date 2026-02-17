import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

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

function renderAttention(items: HomeAgenticItem[]): void {
  render(
    <MemoryRouter>
      <AttentionSection items={items} />
    </MemoryRouter>,
  )
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

  it('navigates to chat when an attention card is clicked', (): void => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AttentionSection items={ATTENTION_ITEMS} />} />
          <Route path="/chat" element={<div>Chat route</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Immediate supplier exception review/i }))

    expect(screen.getByText('Chat route')).toBeInTheDocument()
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
