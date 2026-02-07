import { z } from 'zod'

import {
  invokeRequestSchema,
  streamEventSchema,
  type InvokeRequest,
  type StreamEvent,
} from './types'

interface InvokeStreamParams {
  accessToken: string
  message: string
  requestId: string
  signal: AbortSignal
  sessionId: string
}

const errorPayloadSchema = z
  .object({
    code: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough()

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown stream error'
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError'
  }

  if (error instanceof Error) {
    return error.name === 'AbortError'
  }

  return false
}

function parseJsonStrict(payload: string): unknown {
  try {
    return JSON.parse(payload)
  } catch {
    throw new Error('Invalid JSON payload received from stream')
  }
}

function buildInvokeUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/$/, '')}/invoke`
}

async function buildHttpErrorEvent(response: Response): Promise<StreamEvent> {
  const defaultCode =
    response.status === 401 || response.status === 403 ? 'auth_error' : 'http_error'
  let message = `Request failed with status ${response.status}`
  let code = defaultCode

  const responseText = await response.text()

  if (!responseText) {
    return { type: 'error', code, message }
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const parsedBody = parseJsonStrict(responseText)
    const parsedError = errorPayloadSchema.safeParse(parsedBody)

    if (parsedError.success) {
      code = parsedError.data.code || code
      message = parsedError.data.message || message
      return { type: 'error', code, message }
    }
  }

  return {
    type: 'error',
    code,
    message: responseText,
  }
}

function parseSseEvent(rawEvent: string): StreamEvent | null {
  const lines = rawEvent.split('\n')
  const dataLines: string[] = []

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  const payload = dataLines.join('\n').trim()

  if (!payload) {
    return null
  }

  if (payload === '[DONE]') {
    return { type: 'done' }
  }

  try {
    const json = parseJsonStrict(payload)
    const parsedEvent = streamEventSchema.safeParse(json)

    if (!parsedEvent.success) {
      return {
        type: 'error',
        code: 'malformed_event',
        message: 'Received stream event with an invalid shape',
      }
    }

    return parsedEvent.data
  } catch (error) {
    return {
      type: 'error',
      code: 'malformed_json',
      message: toErrorMessage(error),
    }
  }
}

async function* readSseMessages(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<string, void, undefined> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal.aborted) {
        break
      }

      const chunk = await reader.read()

      if (chunk.done) {
        break
      }

      buffer += decoder.decode(chunk.value, { stream: true })
      const normalizedBuffer = buffer.replace(/\r\n/g, '\n')
      const blocks = normalizedBuffer.split('\n\n')

      buffer = blocks.pop() || ''

      for (const block of blocks) {
        const trimmedBlock = block.trim()

        if (trimmedBlock) {
          yield trimmedBlock
        }
      }
    }

    buffer += decoder.decode()
    const finalBlock = buffer.replace(/\r\n/g, '\n').trim()

    if (finalBlock) {
      yield finalBlock
    }
  } catch (error) {
    if (signal.aborted || isAbortError(error)) {
      return
    }

    throw error
  } finally {
    if (signal.aborted) {
      try {
        await reader.cancel()
      } catch {
        // Ignore read cancellation errors when the request is already aborted.
      }
    }

    reader.releaseLock()
  }
}

export async function* invokeAgentStream(
  params: InvokeStreamParams,
): AsyncGenerator<StreamEvent, void, undefined> {
  const apiBaseUrl = import.meta.env.VITE_API_URL || ''

  if (!apiBaseUrl) {
    yield {
      type: 'error',
      code: 'configuration_error',
      message: 'Missing VITE_API_URL in environment configuration',
    }
    return
  }

  const requestBody: InvokeRequest = invokeRequestSchema.parse({
    action: 'invoke',
    stream: true,
    sessionId: params.sessionId,
    inputs: {
      message: params.message,
      requestId: params.requestId,
    },
  })

  let response: Response

  try {
    response = await fetch(buildInvokeUrl(apiBaseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
        'X-Request-Id': params.requestId,
      },
      body: JSON.stringify(requestBody),
      signal: params.signal,
    })
  } catch (error) {
    if (params.signal.aborted || isAbortError(error)) {
      return
    }

    yield {
      type: 'error',
      code: 'connection_error',
      message: toErrorMessage(error),
    }
    return
  }

  if (!response.ok) {
    try {
      yield await buildHttpErrorEvent(response)
      return
    } catch (error) {
      yield {
        type: 'error',
        code: 'response_parse_error',
        message: toErrorMessage(error),
      }
      return
    }
  }

  if (!response.body) {
    yield {
      type: 'error',
      code: 'stream_error',
      message: 'Stream response did not include a body',
    }
    return
  }

  let didReceiveDone = false

  try {
    for await (const rawEvent of readSseMessages(response.body, params.signal)) {
      if (params.signal.aborted) {
        return
      }

      const streamEvent = parseSseEvent(rawEvent)

      if (!streamEvent) {
        continue
      }

      if (streamEvent.type === 'done') {
        didReceiveDone = true
      }

      yield streamEvent
    }
  } catch (error) {
    if (params.signal.aborted || isAbortError(error)) {
      return
    }

    yield {
      type: 'error',
      code: 'stream_error',
      message: toErrorMessage(error),
    }
    return
  }

  if (!didReceiveDone && !params.signal.aborted) {
    yield { type: 'done' }
  }
}
