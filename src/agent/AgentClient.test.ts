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

  it('yields a connection error event when fetch fails', async (): Promise<void> => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')

    const mockFetch = vi.fn().mockRejectedValue(new Error('network down'))

    vi.stubGlobal('fetch', mockFetch)

    const events = await collectStreamEvents(
      invokeAgentStream({
        accessToken: 'jwt-token',
        message: 'Trigger failure',
        requestId: 'req-999',
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
})
