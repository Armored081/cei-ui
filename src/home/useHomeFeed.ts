import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchHomeFeed } from './HomeFeedApi'
import type { CuratedFeed, FeedCandidate } from './feedSchema'
import type { HomeAgenticItem, HomeMetricItem } from './types'

const HOME_FEED_REFRESH_INTERVAL_MS = 300_000

export interface UseHomeFeedResult {
  feed: CuratedFeed | null
  loading: boolean
  error: string | null
  refresh: () => void
}

interface HomeMockFeed {
  agenticItems: HomeAgenticItem[]
  metricItems: HomeMetricItem[]
}

const DEV_HOME_FEED: HomeMockFeed = {
  agenticItems: [
    {
      id: 'agentic-vektora-nis2-gap',
      severity: 'red',
      title: 'Vektora NIS2 logging coverage gap needs executive review',
      summary:
        'Privileged access logging controls remain below NIS2 minimum expectations across two production domains.',
      confidence: 'high',
    },
    {
      id: 'agentic-gridnova-supplier-decision',
      severity: 'amber',
      title: 'Agent decision pending for GridNova supplier attestations',
      summary:
        'Three GridNova suppliers submitted incomplete control attestations and need acceptance or remediation direction.',
      confidence: 'medium',
    },
    {
      id: 'agentic-feb-operating-review',
      severity: 'amber',
      title: 'February operating review packet requires sign-off',
      summary:
        'The monthly operating review is assembled and waiting for leadership validation before distribution.',
      confidence: 'low',
    },
  ],
  metricItems: [
    {
      id: 'metric-ot-findings',
      label: 'OT findings count',
      value: 12,
      valueDisplay: '12',
      previousValue: 9,
      threshold: {
        direction: 'above',
        amber: 8,
        red: 11,
      },
    },
    {
      id: 'metric-it-ot-segmentation',
      label: 'IT/OT segmentation %',
      value: 91,
      valueDisplay: '91%',
      previousValue: 88,
      threshold: {
        direction: 'below',
        amber: 90,
        red: 85,
      },
    },
    {
      id: 'metric-vendor-coverage',
      label: 'Vendor coverage %',
      value: 76,
      valueDisplay: '76%',
      previousValue: 81,
      threshold: {
        direction: 'below',
        amber: 80,
        red: 70,
      },
    },
  ],
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

function getMockFeedData(): HomeMockFeed {
  if (!import.meta.env.DEV) {
    return {
      agenticItems: [],
      metricItems: [],
    }
  }

  return DEV_HOME_FEED
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
