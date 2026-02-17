import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchHomeFeed } from '../HomeFeedApi'

const BASE_FEED = {
  agentic: [
    {
      id: 'agentic-1',
      type: 'agentic' as const,
      category: 'compliance',
      title: 'Gap requires review',
      summary: 'A control attestation gap requires CISO review.',
      confidence: 'high' as const,
      significanceScore: 0.9,
    },
  ],
  deterministic: [
    {
      id: 'metric-1',
      type: 'deterministic' as const,
      category: 'metrics',
      title: 'Vendor coverage %',
      summary: 'Coverage dipped from prior week.',
      confidence: 'medium' as const,
      significanceScore: 0.5,
      value: 76,
      previousValue: 80,
      threshold: {
        amber: 80,
        red: 70,
        direction: 'below' as const,
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

afterEach((): void => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('fetchHomeFeed', (): void => {
  it('returns parsed feed when the response is wrapped under feed', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ feed: BASE_FEED }), { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const feed = await fetchHomeFeed('token-123')

    expect(feed).toEqual(BASE_FEED)
  })

  it('returns parsed feed when the response payload is flat', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/')
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(BASE_FEED), { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const feed = await fetchHomeFeed('token-123')

    expect(feed.agentic[0].id).toBe('agentic-1')
    expect(feed.deterministic[0].id).toBe('metric-1')
  })

  it('maps backend confidence aliases through schema normalization', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          feed: {
            ...BASE_FEED,
            agentic: [
              {
                ...BASE_FEED.agentic[0],
                confidence: 'verified',
              },
            ],
            deterministic: [
              {
                ...BASE_FEED.deterministic[0],
                confidence: 'stale',
              },
            ],
          },
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    const feed = await fetchHomeFeed('token-123')

    expect(feed.agentic[0].confidence).toBe('high')
    expect(feed.deterministic[0].confidence).toBe('low')
  })

  it('sends authorization header and expected invoke request payload', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ feed: BASE_FEED }), { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    await fetchHomeFeed('jwt-token')

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/invoke')
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer jwt-token',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    })
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body as string)).toEqual({
      action: 'home_feed',
      inputs: { role: 'ciso' },
    })
  })

  it('throws a descriptive error for non-ok responses', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'home_feed action not implemented' }), {
          status: 400,
          statusText: 'Bad Request',
        }),
      ),
    )

    await expect(fetchHomeFeed('token-123')).rejects.toThrow(
      'Failed to fetch home feed: home_feed action not implemented',
    )
  })

  it('falls back to status text when non-ok response body is not JSON', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('invalid json', {
          status: 500,
          statusText: 'Internal Server Error',
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )

    await expect(fetchHomeFeed('token-123')).rejects.toThrow(
      'Failed to fetch home feed: 500 Internal Server Error',
    )
  })

  it('throws when VITE_API_URL is missing', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', '')
    vi.stubGlobal('fetch', vi.fn())

    await expect(fetchHomeFeed('token-123')).rejects.toThrow(
      'Missing VITE_API_URL in environment configuration',
    )
  })

  it('throws when successful response body is not JSON', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('plain text', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )

    await expect(fetchHomeFeed('token-123')).rejects.toThrow(
      'Failed to fetch home feed: response was not valid JSON',
    )
  })

  it('throws when response JSON does not match curated feed schema', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            feed: {
              ...BASE_FEED,
              generatedAt: 123,
            },
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(fetchHomeFeed('token-123')).rejects.toThrow('Invalid home feed response:')
  })
})
