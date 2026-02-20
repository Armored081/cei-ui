import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useHomeFeed } from '../useHomeFeed'

const {
  mockFetchHomeFeed,
  mockGetAccessToken,
}: {
  mockFetchHomeFeed: ReturnType<typeof vi.fn>
  mockGetAccessToken: ReturnType<typeof vi.fn<() => Promise<string>>>
} = vi.hoisted(() => ({
  mockFetchHomeFeed: vi.fn(),
  mockGetAccessToken: vi.fn<() => Promise<string>>(),
}))

vi.mock('../HomeFeedApi', () => ({
  fetchHomeFeed: mockFetchHomeFeed,
}))

const API_FEED = {
  agentic: [
    {
      id: 'agentic-1',
      type: 'agentic' as const,
      category: 'compliance',
      title: 'API agentic item',
      summary: 'Needs executive review',
      confidence: 'high' as const,
      significanceScore: 0.9,
    },
  ],
  deterministic: [],
  generatedAt: '2026-02-17T08:00:00.000Z',
  cadenceState: {
    currentPeriod: '2026-W07',
    isReviewWeek: false,
    dayOfWeek: 2,
    activeTargets: 3,
  },
}

beforeEach((): void => {
  mockFetchHomeFeed.mockReset()
  mockGetAccessToken.mockReset()
  mockGetAccessToken.mockResolvedValue('access-token')
})

afterEach((): void => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('useHomeFeed', (): void => {
  it('loads successfully and clears loading/error state', async (): Promise<void> => {
    vi.stubEnv('MODE', 'production')
    mockFetchHomeFeed.mockResolvedValue(API_FEED)

    const { result } = renderHook(() => useHomeFeed(mockGetAccessToken))

    expect(result.current.loading).toBe(true)
    expect(result.current.feed).toBeNull()

    await waitFor((): void => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.feed).toEqual(API_FEED)
  })

  it('sets an error in production mode when API fetch fails', async (): Promise<void> => {
    vi.stubEnv('MODE', 'production')
    mockFetchHomeFeed.mockRejectedValue(new Error('backend unavailable'))

    const { result } = renderHook(() => useHomeFeed(mockGetAccessToken))

    await waitFor((): void => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.feed).toBeNull()
    expect(result.current.error).toContain('Unable to load home feed.')
    expect(result.current.error).toContain('backend unavailable')
  })

  it('falls back to mock feed data in development mode when API fetch fails', async (): Promise<void> => {
    vi.stubEnv('MODE', 'development')
    mockFetchHomeFeed.mockRejectedValue(new Error('home_feed action not implemented'))

    const { result } = renderHook(() => useHomeFeed(mockGetAccessToken))

    await waitFor((): void => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.feed?.agentic.length || 0).toBeGreaterThan(0)
    expect(result.current.feed?.deterministic.length || 0).toBeGreaterThan(0)
    expect(result.current.feed?.agentic[0]).toMatchObject({
      id: 'agentic-vektora-nis2-gap',
      type: 'agentic',
      category: 'compliance',
      significanceScore: 0.8,
    })
    expect(result.current.feed?.deterministic[0]).toMatchObject({
      id: 'metric-ot-findings',
      type: 'deterministic',
      category: 'metrics',
      significanceScore: 0.5,
      value: 12,
      previousValue: 9,
    })
    expect(result.current.feed?.cadenceState).toEqual({
      currentPeriod: 'mock',
      isReviewWeek: false,
      dayOfWeek: 1,
      activeTargets: 3,
    })
  })

  it('passes access token from getAccessToken into fetchHomeFeed', async (): Promise<void> => {
    vi.stubEnv('MODE', 'production')
    mockGetAccessToken.mockResolvedValue('jwt-abc')
    mockFetchHomeFeed.mockResolvedValue(API_FEED)

    renderHook(() => useHomeFeed(mockGetAccessToken))

    await waitFor((): void => {
      expect(mockFetchHomeFeed).toHaveBeenCalledWith('jwt-abc')
    })
  })

  it('refresh triggers a new fetch call', async (): Promise<void> => {
    vi.stubEnv('MODE', 'production')
    mockFetchHomeFeed.mockResolvedValue(API_FEED)

    const { result } = renderHook(() => useHomeFeed(mockGetAccessToken))

    await waitFor((): void => {
      expect(mockFetchHomeFeed).toHaveBeenCalledTimes(1)
    })

    act((): void => {
      result.current.refresh()
    })

    await waitFor((): void => {
      expect(mockFetchHomeFeed).toHaveBeenCalledTimes(2)
    })
  })

  it('auto-refreshes every five minutes', async (): Promise<void> => {
    vi.useFakeTimers()
    vi.stubEnv('MODE', 'production')
    mockFetchHomeFeed.mockResolvedValue(API_FEED)

    renderHook(() => useHomeFeed(mockGetAccessToken))

    await act(async (): Promise<void> => {
      await Promise.resolve()
    })
    expect(mockFetchHomeFeed).toHaveBeenCalledTimes(1)

    await act(async (): Promise<void> => {
      await vi.advanceTimersByTimeAsync(300_000)
    })

    expect(mockFetchHomeFeed).toHaveBeenCalledTimes(2)
  })

  it('clears auto-refresh interval on unmount', async (): Promise<void> => {
    vi.useFakeTimers()
    vi.stubEnv('MODE', 'production')
    mockFetchHomeFeed.mockResolvedValue(API_FEED)

    const { unmount } = renderHook(() => useHomeFeed(mockGetAccessToken))

    await act(async (): Promise<void> => {
      await Promise.resolve()
    })
    expect(mockFetchHomeFeed).toHaveBeenCalledTimes(1)

    unmount()

    await act(async (): Promise<void> => {
      await vi.advanceTimersByTimeAsync(600_000)
    })

    expect(mockFetchHomeFeed).toHaveBeenCalledTimes(1)
  })

  it('keeps loading true until the first request settles', async (): Promise<void> => {
    vi.stubEnv('MODE', 'production')
    let resolveFetch: ((value: typeof API_FEED) => void) | null = null
    mockFetchHomeFeed.mockImplementation(
      () =>
        new Promise((resolve): void => {
          resolveFetch = resolve
        }),
    )

    const { result } = renderHook(() => useHomeFeed(mockGetAccessToken))

    expect(result.current.loading).toBe(true)

    await act(async (): Promise<void> => {
      await Promise.resolve()
    })

    if (!resolveFetch) {
      throw new Error('Expected fetch resolver to be set')
    }

    await act(async (): Promise<void> => {
      resolveFetch?.(API_FEED)
    })

    await waitFor((): void => {
      expect(result.current.loading).toBe(false)
    })
  })
})
