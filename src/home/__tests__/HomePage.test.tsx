import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '../HomePage'
import type { HomeAgenticItem, HomeMetricItem } from '../mockFeedData'

const { mockUseAuth, mockLogout } = vi.hoisted(
  (): {
    mockUseAuth: ReturnType<typeof vi.fn>
    mockLogout: ReturnType<typeof vi.fn>
  } => ({
    mockUseAuth: vi.fn(),
    mockLogout: vi.fn(),
  }),
)

vi.mock('../../auth/AuthProvider', (): { useAuth: typeof mockUseAuth } => ({
  useAuth: mockUseAuth,
}))

function renderHomePage(
  props: Partial<{ agenticItems: HomeAgenticItem[]; metricItems: HomeMetricItem[] }> = {},
): void {
  render(
    <MemoryRouter>
      <HomePage {...props} />
    </MemoryRouter>,
  )
}

beforeEach((): void => {
  mockUseAuth.mockReset()
  mockLogout.mockReset()

  mockLogout.mockResolvedValue(undefined)
  mockUseAuth.mockReturnValue({
    logout: mockLogout,
    userEmail: 'analyst@example.com',
  })
})

afterEach((): void => {
  vi.useRealTimers()
})

describe('HomePage', (): void => {
  it('renders greeting, date, and all section headings', (): void => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 1, 17, 9, 30, 0))

    renderHomePage()

    expect(screen.getByRole('heading', { name: 'Good morning' })).toBeInTheDocument()
    expect(screen.getByText('Tuesday, February 17, 2026')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Attention Needed' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Metrics at a Glance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Quick Start' })).toBeInTheDocument()
  })

  it('renders development mock feed items by default', (): void => {
    renderHomePage()

    expect(
      screen.getByRole('button', {
        name: /Vektora NIS2 logging coverage gap needs executive review/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /OT findings count/i })).toBeInTheDocument()
  })

  it('shows empty section states when feed arrays are empty', (): void => {
    renderHomePage({ agenticItems: [], metricItems: [] })

    expect(screen.getByText('All clear — no urgent items right now')).toBeInTheDocument()
    expect(screen.getByText('No metrics available yet')).toBeInTheDocument()
  })

  it('shows authenticated user email in the top bar', (): void => {
    renderHomePage()

    expect(screen.getByText('analyst@example.com')).toBeInTheDocument()
  })

  it('calls logout when sign out is clicked', (): void => {
    renderHomePage()

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('renders exactly four quick start cards', (): void => {
    renderHomePage()

    const quickStartSection = screen
      .getByRole('heading', { name: 'Quick Start' })
      .closest('section')

    if (!(quickStartSection instanceof HTMLElement)) {
      throw new Error('Quick Start section was not rendered')
    }

    expect(within(quickStartSection).getAllByRole('button')).toHaveLength(4)
  })
})
