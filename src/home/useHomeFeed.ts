import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchHomeFeed } from './HomeFeedApi'
import type { CuratedFeed, FeedCandidate } from './feedSchema'
import { getMockFeedData } from './mockFeedData'

const HOME_FEED_REFRESH_INTERVAL_MS = 300_000

export interface UseHomeFeedResult {
  feed: CuratedFeed | null
  loading: boolean
  error: string | null
  refresh: () => void
}

function toAgenticCandidate(item: {
  id: string
  title: string
  summary: string
  confidence: FeedCandidate['confidence']
}): FeedCandidate {
  return {
    id: item.id,
    type: 'agentic',
    category: 'compliance',
    title: item.title,
    summary: item.summary,
    confidence: item.confidence,
    significanceScore: 0.8,
  }
}

function toDeterministicCandidate(item: {
  id: string
  label: string
  value: number
  valueDisplay: string
  previousValue: number
  threshold: { amber: number; red: number; direction: 'above' | 'below' }
}): FeedCandidate {
  return {
    id: item.id,
    type: 'deterministic',
    category: 'metrics',
    title: item.label,
    summary: `Latest reading for ${item.label}: ${item.valueDisplay}`,
    confidence: 'unknown',
    significanceScore: 0.5,
    value: item.value,
    previousValue: item.previousValue,
    threshold: item.threshold,
  }
}

function mockCuratedFeed(): CuratedFeed {
  const mockFeed = getMockFeedData()

  return {
    agentic: mockFeed.agenticItems.map(toAgenticCandidate),
    deterministic: mockFeed.metricItems.map(toDeterministicCandidate),
    generatedAt: new Date().toISOString(),
    cadenceState: {
      currentPeriod: 'mock',
      isReviewWeek: false,
      dayOfWeek: 1,
      activeTargets: 3,
    },
  }
}

function toReadableError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return `Unable to load home feed. ${error.message}`
  }

  return 'Unable to load home feed. Please try again.'
}

function isDevelopmentMode(): boolean {
  const mode = (import.meta.env.MODE || '').toLowerCase()

  if (mode) {
    return mode === 'development'
  }

  return String(import.meta.env.DEV) === 'true'
}

/**
 * Fetches and caches the curated home feed with periodic refresh.
 *
 * @param getAccessToken - Auth provider callback that returns a current access token
 * @returns Home feed state and refresh trigger
 */
export function useHomeFeed(getAccessToken: () => Promise<string>): UseHomeFeedResult {
  const [feed, setFeed] = useState<CuratedFeed | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef<boolean>(true)

  const loadFeed = useCallback(async (): Promise<void> => {
    setLoading(true)

    try {
      const accessToken = await getAccessToken()
      const nextFeed = await fetchHomeFeed(accessToken)

      if (!isMountedRef.current) {
        return
      }

      setFeed(nextFeed)
      setError(null)
    } catch (loadError) {
      if (!isMountedRef.current) {
        return
      }

      if (isDevelopmentMode()) {
        setFeed(mockCuratedFeed())
        setError(null)
      } else {
        setFeed(null)
        setError(toReadableError(loadError))
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [getAccessToken])

  const refresh = useCallback((): void => {
    void loadFeed()
  }, [loadFeed])

  useEffect((): (() => void) => {
    isMountedRef.current = true

    void loadFeed()

    const intervalId = window.setInterval((): void => {
      void loadFeed()
    }, HOME_FEED_REFRESH_INTERVAL_MS)

    return (): void => {
      isMountedRef.current = false
      window.clearInterval(intervalId)
    }
  }, [loadFeed])

  return {
    feed,
    loading,
    error,
    refresh,
  }
}
