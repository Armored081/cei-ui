import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '../HomePage'
import type { HomeAgenticItem, HomeMetricItem } from '../types'

const { mockUseAuth, mockLogout, mockGetAccessToken, mockUseHomeFeed, mockRefresh } = vi.hoisted(
  (): {
    mockUseAuth: ReturnType<typeof vi.fn>
    mockLogout: ReturnType<typeof vi.fn>
    mockGetAccessToken: ReturnType<typeof vi.fn>
    mockUseHomeFeed: ReturnType<typeof vi.fn>
    mockRefresh: ReturnType<typeof vi.fn>
  } => ({
    mockUseAuth: vi.fn(),
    mockLogout: vi.fn(),
    mockGetAccessToken: vi.fn(),
    mockUseHomeFeed: vi.fn(),
    mockRefresh: vi.fn(),
  }),
)

vi.mock('../../auth/AuthProvider', (): { useAuth: typeof mockUseAuth } => ({
  useAuth: mockUseAuth,
}))

vi.mock('../useHomeFeed', (): { useHomeFeed: typeof mockUseHomeFeed } => ({
  useHomeFeed: mockUseHomeFeed,
}))

function renderHomePage(
  props: Partial<{ agenticItems: HomeAgenticItem[]; metricItems: HomeMetricItem[] }> = {},
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <HomePage {...props} />
    </MemoryRouter>,
  )
}

const FEED_DATA = {
  agentic: [
    {
      id: 'feed-agentic-1',
      type: 'agentic' as const,
      category: 'compliance',
      title: 'Feed attention item',
      summary: 'Feed summary text',
      confidence: 'high' as const,
      significanceScore: 0.9,
    },
  ],
  deterministic: [
    {
      id: 'feed-metric-1',
      type: 'deterministic' as const,
      category: 'metrics',
      title: 'Feed metric label',
      summary: 'Feed metric summary',
      confidence: 'medium' as const,
      significanceScore: 0.5,
      value: 91,
      previousValue: 88,
      threshold: {
        direction: 'below' as const,
        amber: 90,
        red: 85,
      },
    },
  ],
  generatedAt: '2026-02-17T08:00:00.000Z',
  cadenceState: {
    currentPeriod: '2026-W07',
    isReviewWeek: false,
    dayOfWeek: 2,
    activeTargets: 3,
  },
}

beforeEach((): void => {
  mockUseAuth.mockReset()
  mockLogout.mockReset()
  mockGetAccessToken.mockReset()
  mockUseHomeFeed.mockReset()
  mockRefresh.mockReset()

  mockLogout.mockResolvedValue(undefined)
  mockGetAccessToken.mockResolvedValue('access-token')
  mockUseAuth.mockReturnValue({
    getAccessToken: mockGetAccessToken,
    logout: mockLogout,
    userEmail: 'analyst@example.com',
  })
  mockUseHomeFeed.mockReturnValue({
    feed: FEED_DATA,
    loading: false,
    error: null,
    refresh: mockRefresh,
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

  it('renders feed items returned by useHomeFeed', (): void => {
    renderHomePage()

    expect(screen.getByRole('button', { name: /Feed attention item/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Feed metric label/i })).toBeInTheDocument()
  })

  it('renders loading state from useHomeFeed', (): void => {
    mockUseHomeFeed.mockReturnValue({
      feed: null,
      loading: true,
      error: null,
      refresh: mockRefresh,
    })

    const { container } = renderHomePage()

    expect(container.querySelectorAll('.cei-home-attention-card--skeleton')).toHaveLength(3)
    expect(container.querySelectorAll('.cei-home-metric-card--skeleton')).toHaveLength(3)
  })

  it('renders error state from useHomeFeed and retries via refresh callback', (): void => {
    mockUseHomeFeed.mockReturnValue({
      feed: null,
      loading: false,
      error: 'Failed to load home feed',
      refresh: mockRefresh,
    })

    renderHomePage()

    expect(screen.getAllByRole('alert')).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0])

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('shows empty section states when feed arrays are empty', (): void => {
    renderHomePage({ agenticItems: [], metricItems: [] })

    expect(screen.getByText('All clear — no urgent items right now')).toBeInTheDocument()
    expect(screen.getByText('No metrics available yet')).toBeInTheDocument()
    expect(mockUseHomeFeed).not.toHaveBeenCalled()
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

  it('skips useHomeFeed when explicit section props are provided', (): void => {
    renderHomePage({
      agenticItems: [
        {
          id: 'override-agentic',
          severity: 'amber',
          title: 'Override attention',
          summary: 'Override summary',
          confidence: 'low',
        },
      ],
      metricItems: [
        {
          id: 'override-metric',
          label: 'Override metric',
          value: 11,
          valueDisplay: '11',
          previousValue: 10,
          threshold: {
            direction: 'above',
            amber: 8,
            red: 12,
          },
        },
      ],
    })

    expect(screen.getByRole('button', { name: /Override attention/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Override metric/i })).toBeInTheDocument()
    expect(mockUseHomeFeed).not.toHaveBeenCalled()
  })
})
