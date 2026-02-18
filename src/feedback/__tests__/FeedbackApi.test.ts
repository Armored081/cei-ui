import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  listAllFeedback,
  listFeedback,
  submitFeedback,
  updateFeedbackStatus,
} from '../FeedbackApi.js'

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function createJwt(sub: string): string {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = encodeBase64Url(JSON.stringify({ sub }))
  return `${header}.${payload}.signature`
}

afterEach((): void => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('FeedbackApi direct AgentCore invocation', (): void => {
  it('submitFeedback invokes feedback_create through AgentCore when direct mode is enabled', async (): Promise<void> => {
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
          result: {
            id: 'feedback-1',
            status: 'new',
          },
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    const response = await submitFeedback('token-123', {
      idempotencyKey: 'idem-1',
      category: 'bug',
      title: 'Duplicate rows',
      summary: 'Rows duplicate after filter changes',
      threadContext: { threadId: 'thread-1' },
    })

    expect(response).toEqual({ id: 'feedback-1', status: 'new' })

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://bedrock-agentcore.us-west-2.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-west-2%3A123456789012%3Aruntime%2Ftest-runtime/invocations?qualifier=cei_dev_endpoint',
    )
    expect(options.method).toBe('POST')

    const headers = options.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer token-123')
    expect(headers.Accept).toBe('application/json')
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id']).toContain(
      'cei-session-feedback-',
    )
    expect(headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'].length).toBeGreaterThanOrEqual(33)

    expect(JSON.parse(options.body as string)).toEqual({
      action: 'feedback_create',
      inputs: {
        idempotencyKey: 'idem-1',
        category: 'bug',
        title: 'Duplicate rows',
        summary: 'Rows duplicate after filter changes',
        threadContext: { threadId: 'thread-1' },
      },
      stream: false,
    })
  })

  it('listFeedback invokes feedback_list and accepts wrapped result payloads', async (): Promise<void> => {
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
          result: {
            items: [
              {
                id: 'feedback-1',
                idempotency_key: 'idem-1',
                category: 'idea',
                title: 'Save chart presets',
                summary: 'Allow saved presets for chart layout',
                status: 'triaged',
                created_at: '2026-02-18T00:00:00.000Z',
                updated_at: '2026-02-18T00:00:00.000Z',
              },
            ],
            nextCursor: 'cursor-2',
          },
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    const response = await listFeedback('token-abc', {
      cursor: 'cursor-1',
      limit: 25,
      category: 'idea',
      status: 'triaged',
    })

    expect(response.nextCursor).toBe('cursor-2')

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(options.body as string)).toEqual({
      action: 'feedback_list',
      inputs: {
        cursor: 'cursor-1',
        limit: 25,
        category: 'idea',
        status: 'triaged',
      },
      stream: false,
    })
  })

  it('listAllFeedback invokes feedback_list in direct mode without admin inputs', async (): Promise<void> => {
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
          items: [],
          nextCursor: null,
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    const response = await listAllFeedback('token-xyz', { limit: 10 })

    expect(response).toEqual({ items: [], nextCursor: null })

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(options.body as string)).toEqual({
      action: 'feedback_list',
      inputs: {
        limit: 10,
      },
      stream: false,
    })
  })

  it('updateFeedbackStatus surfaces action errors when invocation returns ok false', async (): Promise<void> => {
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
            ok: false,
            error: {
              code: 'forbidden',
              message: 'Not allowed to update this feedback',
            },
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(updateFeedbackStatus('token-xyz', 'feedback-1', 'triaged')).rejects.toThrow(
      'forbidden: Not allowed to update this feedback',
    )
  })

  it('falls back to REST list endpoint when direct mode is disabled', async (): Promise<void> => {
    vi.stubEnv('VITE_USE_DIRECT_AGENTCORE', 'false')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const accessToken = createJwt('user-123')
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
          nextCursor: null,
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', mockFetch)

    await listAllFeedback(accessToken, { limit: 25, category: 'bug' })

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/v1/feedback?admin=true&limit=25&category=bug')
    expect(options.method).toBe('GET')

    const headers = options.headers as Record<string, string>
    expect(headers['x-user-id']).toBe('user-123')
  })

  it('throws when direct mode is enabled without AgentCore env vars', async (): Promise<void> => {
    vi.stubEnv('VITE_USE_DIRECT_AGENTCORE', 'true')
    vi.stubEnv('VITE_AGENTCORE_REGION', '')
    vi.stubEnv('VITE_AGENT_RUNTIME_ARN', '')

    await expect(
      submitFeedback('token-123', {
        idempotencyKey: 'idem-1',
        category: 'bug',
        title: 'Broken chart',
        summary: 'Chart fails on refresh',
      }),
    ).rejects.toThrow('Missing VITE_AGENTCORE_REGION or VITE_AGENT_RUNTIME_ARN')
  })
})
