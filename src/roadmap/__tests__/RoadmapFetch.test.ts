import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchRoadmapItems } from '../RoadmapFetch'

const BASE_ITEMS = [
  {
    id: 'roadmap-1',
    title: 'Direct invocation support',
    description: 'Route roadmap list through invocation endpoint.',
    category: 'platform' as const,
    status: 'in-progress' as const,
    horizon: 'now' as const,
    shipped_at: null,
    sort_order: 1,
    created_at: '2026-02-17T00:00:00.000Z',
    updated_at: '2026-02-17T00:00:00.000Z',
  },
]

afterEach((): void => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('fetchRoadmapItems', (): void => {
  it('uses REST roadmap endpoint when direct AgentCore mode is disabled', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/')
    vi.stubEnv('VITE_USE_DIRECT_AGENTCORE', 'false')
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ items: BASE_ITEMS, total: 1 }), { status: 200 }),
      )
    vi.stubGlobal('fetch', mockFetch)

    const response = await fetchRoadmapItems('token-123')

    expect(response).toEqual({ items: BASE_ITEMS, total: 1 })

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/v1/roadmap/items')
    expect(options.method).toBe('GET')
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer token-123',
      Accept: 'application/json',
    })
  })

  it('uses direct AgentCore invocation with roadmap_list action when enabled', async (): Promise<void> => {
    vi.stubEnv('VITE_USE_DIRECT_AGENTCORE', 'true')
    vi.stubEnv('VITE_AGENTCORE_REGION', 'us-west-2')
    vi.stubEnv(
      'VITE_AGENT_RUNTIME_ARN',
      'arn:aws:bedrock-agentcore:us-west-2:123456789012:runtime/test-runtime',
    )

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          items: BASE_ITEMS,
          total: 1,
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    const response = await fetchRoadmapItems('id-token-abc')

    expect(response.total).toBe(1)

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://bedrock-agentcore.us-west-2.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-west-2%3A123456789012%3Aruntime%2Ftest-runtime/invocations?qualifier=cei_dev_endpoint',
    )
    expect(options.method).toBe('POST')

    const headers = options.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer id-token-abc')
    expect(headers.Accept).toBe('application/json')
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id']).toContain('cei-session-roadmap-')

    expect(JSON.parse(options.body as string)).toEqual({
      action: 'roadmap_list',
      inputs: {},
      stream: false,
    })
  })

  it('accepts wrapped invocation result payloads', async (): Promise<void> => {
    vi.stubEnv('VITE_USE_DIRECT_AGENTCORE', 'true')
    vi.stubEnv('VITE_AGENTCORE_REGION', 'us-west-2')
    vi.stubEnv(
      'VITE_AGENT_RUNTIME_ARN',
      'arn:aws:bedrock-agentcore:us-west-2:123456789012:runtime/test-runtime',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            result: {
              items: BASE_ITEMS,
              total: '1',
            },
          }),
          { status: 200 },
        ),
      ),
    )

    const response = await fetchRoadmapItems('token-123')

    expect(response).toEqual({ items: BASE_ITEMS, total: 1 })
  })

  it('throws a descriptive error for non-ok responses', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'roadmap_list action is not enabled' }), {
          status: 400,
          statusText: 'Bad Request',
        }),
      ),
    )

    await expect(fetchRoadmapItems('token-123')).rejects.toThrow(
      'Failed to fetch roadmap items: roadmap_list action is not enabled',
    )
  })

  it('throws when direct mode is enabled without AgentCore runtime env vars', async (): Promise<void> => {
    vi.stubEnv('VITE_USE_DIRECT_AGENTCORE', 'true')
    vi.stubEnv('VITE_AGENTCORE_REGION', '')
    vi.stubEnv('VITE_AGENT_RUNTIME_ARN', '')

    await expect(fetchRoadmapItems('token-123')).rejects.toThrow(
      'Missing VITE_AGENTCORE_REGION or VITE_AGENT_RUNTIME_ARN',
    )
  })

  it('throws when successful response body is not valid roadmap payload', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ total: 1 }), { status: 200 })),
    )

    await expect(fetchRoadmapItems('token-123')).rejects.toThrow(
      'Invalid roadmap response: expected { items: RoadmapItem[] }',
    )
  })
})
