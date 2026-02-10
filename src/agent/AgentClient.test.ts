import { describe, expect, it, vi, afterEach } from 'vitest'

import { invokeAgentStream } from './AgentClient'
import type { StreamEvent } from './types'

function makeSseResponse(events: string[]): Response {
  const encoder = new TextEncoder()

  const body = new ReadableStream<Uint8Array>({
    start(controller): void {
      for (const event of events) {
        controller.enqueue(encoder.encode(`${event}\n\n`))
      }

      controller.close()
    },
  })

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
    },
  })
}

async function collectStreamEvents(
  generator: AsyncGenerator<StreamEvent, void, undefined>,
): Promise<StreamEvent[]> {
  const events: StreamEvent[] = []

  for await (const event of generator) {
    events.push(event)
  }

  return events
}

afterEach((): void => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function createSignal(): AbortSignal {
  return new AbortController().signal
}

describe('invokeAgentStream', (): void => {
  it('parses SSE events into typed stream events', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        makeSseResponse([
          'data: {"type":"delta","content":"Hello"}',
          'data: {"type":"delta","content":" world"}',
          'data: {"type":"done","summary":"complete"}',
        ]),
      )

    vi.stubGlobal('fetch', mockFetch)

    const events = await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'token-123',
        message: 'Test prompt',
        requestId: 'request-123',
        signal: createSignal(),
        sessionId: 'session-123',
      }),
    )

    expect(events).toEqual([
      { type: 'delta', content: 'Hello' },
      { type: 'delta', content: ' world' },
      { type: 'done', summary: 'complete' },
    ])
  })

  it('includes authorization and request id headers', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/')

    const mockFetch = vi.fn().mockResolvedValue(makeSseResponse(['data: {"type":"done"}']))

    vi.stubGlobal('fetch', mockFetch)

    await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        message: 'Security check',
        requestId: 'req-789',
        signal: createSignal(),
        sessionId: 'session-456',
      }),
    )

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('https://api.example.com/invoke')
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer jwt-token',
      'X-Request-Id': 'req-789',
      'Content-Type': 'application/json',
    })
  })

  it('uses direct AgentCore invocation when feature flag is enabled', async (): Promise<void> => {
    vi.stubEnv('VITE_USE_DIRECT_AGENTCORE', 'true')
    vi.stubEnv(
      'VITE_AGENT_RUNTIME_ARN',
      'arn:aws:bedrock-agentcore:us-east-1:149425764951:runtime/cei_dev_agent_v8-vqRSO4CYrY',
    )
    vi.stubEnv('VITE_AGENTCORE_REGION', 'us-east-1')

    const mockFetch = vi.fn().mockResolvedValue(makeSseResponse(['data: {"type":"done"}']))
    vi.stubGlobal('fetch', mockFetch)

    await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        message: 'Direct call',
        requestId: 'req-direct',
        signal: createSignal(),
        sessionId: 'session-direct',
      }),
    )

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    const expectedArn =
      'arn:aws:bedrock-agentcore:us-east-1:149425764951:runtime/cei_dev_agent_v8-vqRSO4CYrY'

    expect(url).toBe(
      `https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/${encodeURIComponent(
        expectedArn,
      )}/invocations?qualifier=DEFAULT`,
    )

    expect(options.headers).toMatchObject({
      Authorization: 'Bearer jwt-token',
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    })

    // Direct invoke requires session id header and does not use the proxy request id header.
    expect(options.headers).toMatchObject({
      'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': expect.any(String),
    })
    expect(options.headers).not.toMatchObject({
      'X-Request-Id': expect.any(String),
    })

    const requestBodyRaw = options.body
    expect(typeof requestBodyRaw).toBe('string')
    const parsedRequestBody = JSON.parse(requestBodyRaw as string) as Record<string, unknown>
    expect(parsedRequestBody).not.toHaveProperty('sessionId')
  })

  it('falls back to the API proxy invocation when feature flag is disabled', async (): Promise<void> => {
    vi.stubEnv('VITE_USE_DIRECT_AGENTCORE', 'false')
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubEnv('VITE_AGENTCORE_REGION', 'us-east-1')
    vi.stubEnv(
      'VITE_AGENT_RUNTIME_ARN',
      'arn:aws:bedrock-agentcore:us-east-1:149425764951:runtime/ignored',
    )

    const mockFetch = vi.fn().mockResolvedValue(makeSseResponse(['data: {"type":"done"}']))
    vi.stubGlobal('fetch', mockFetch)

    await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        message: 'Proxy call',
        requestId: 'req-proxy',
        signal: createSignal(),
        sessionId: 'session-proxy',
      }),
    )

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('https://api.example.com/invoke')
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer jwt-token',
      'X-Request-Id': 'req-proxy',
      'Content-Type': 'application/json',
    })
  })

  it('enforces minimum AgentCore session id length in the direct invocation header', async (): Promise<void> => {
    vi.stubEnv('VITE_USE_DIRECT_AGENTCORE', 'true')
    vi.stubEnv(
      'VITE_AGENT_RUNTIME_ARN',
      'arn:aws:bedrock-agentcore:us-east-1:149425764951:runtime/cei_dev_agent_v8-vqRSO4CYrY',
    )
    vi.stubEnv('VITE_AGENTCORE_REGION', 'us-east-1')

    const mockFetch = vi.fn().mockResolvedValue(makeSseResponse(['data: {"type":"done"}']))
    vi.stubGlobal('fetch', mockFetch)

    await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        message: 'Session check',
        requestId: 'req-session',
        signal: createSignal(),
        sessionId: 'short',
      }),
    )

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    const headers = options.headers as Record<string, string>
    const sessionHeaderValue = headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id']

    expect(typeof sessionHeaderValue).toBe('string')
    expect(sessionHeaderValue.startsWith('cei-session-')).toBe(true)
    expect(sessionHeaderValue.length).toBeGreaterThanOrEqual(33)
  })

  it('includes attachments in invoke inputs when provided', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const mockFetch = vi.fn().mockResolvedValue(makeSseResponse(['data: {"type":"done"}']))

    vi.stubGlobal('fetch', mockFetch)

    await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        attachments: [
          {
            data: 'c2FtcGxl',
            mime: 'text/plain',
            name: 'evidence.txt',
            sizeBytes: 6,
          },
        ],
        message: 'Review evidence',
        requestId: 'req-attachments',
        signal: createSignal(),
        sessionId: 'session-attachments',
      }),
    )

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    const requestBodyRaw = options.body

    expect(typeof requestBodyRaw).toBe('string')

    const parsedRequestBody = JSON.parse(requestBodyRaw as string) as {
      inputs: {
        attachments?: Array<{ name: string; mime: string; data: string; sizeBytes: number }>
      }
    }

    expect(parsedRequestBody.inputs.attachments).toEqual([
      {
        data: 'c2FtcGxl',
        mime: 'text/plain',
        name: 'evidence.txt',
        sizeBytes: 6,
      },
    ])
  })

  it('yields a connection error event when fetch fails', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const mockFetch = vi.fn().mockRejectedValue(new Error('network down'))

    vi.stubGlobal('fetch', mockFetch)

    const events = await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        message: 'Trigger failure',
        requestId: 'req-999',
        signal: createSignal(),
        sessionId: 'session-999',
      }),
    )

    expect(events).toEqual([
      {
        type: 'error',
        code: 'connection_error',
        message: 'network down',
      },
    ])
  })

  it('resolves without events when fetch is aborted', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const controller = new AbortController()
    controller.abort()

    const mockFetch = vi
      .fn()
      .mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'))

    vi.stubGlobal('fetch', mockFetch)

    const events = await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        message: 'Trigger abort',
        requestId: 'req-abort',
        signal: controller.signal,
        sessionId: 'session-abort',
      }),
    )

    expect(events).toEqual([])
  })

  it('yields an auth error event for 401 responses', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Token expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', mockFetch)

    const events = await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        message: 'Trigger auth failure',
        requestId: 'req-auth',
        signal: createSignal(),
        sessionId: 'session-auth',
      }),
    )

    expect(events).toEqual([
      {
        type: 'error',
        code: 'auth_error',
        message: 'Token expired',
      },
    ])
  })

  it('yields a forbidden error event for 403 responses', async (): Promise<void> => {
    vi.stubEnv('VITE_USE_DIRECT_AGENTCORE', 'true')
    vi.stubEnv(
      'VITE_AGENT_RUNTIME_ARN',
      'arn:aws:bedrock-agentcore:us-east-1:149425764951:runtime/cei_dev_agent_v8-vqRSO4CYrY',
    )
    vi.stubEnv('VITE_AGENTCORE_REGION', 'us-east-1')

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', mockFetch)

    const events = await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        message: 'Trigger forbidden',
        requestId: 'req-forbidden',
        signal: createSignal(),
        sessionId: 'session-forbidden',
      }),
    )

    expect(events).toEqual([
      {
        type: 'error',
        code: 'forbidden_error',
        message: 'Access denied',
      },
    ])
  })

  it('yields an interruption error when the stream closes before done', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const mockFetch = vi
      .fn()
      .mockResolvedValue(makeSseResponse(['data: {"type":"delta","content":"Partial"}']))

    vi.stubGlobal('fetch', mockFetch)

    const events = await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        message: 'Trigger interruption',
        requestId: 'req-interrupted',
        signal: createSignal(),
        sessionId: 'session-interrupted',
      }),
    )

    expect(events).toEqual([
      { type: 'delta', content: 'Partial' },
      {
        type: 'error',
        code: 'stream_interrupted',
        message: 'The response stream ended before completion.',
      },
    ])
  })
})
