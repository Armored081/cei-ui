import { z } from 'zod'

import {
  invokeRequestSchema,
  streamEventSchema,
  type AttachmentInput,
  type InvokeRequest,
  type StreamEvent,
} from './types'

type DirectInvokeRequest = Omit<InvokeRequest, 'sessionId'>

interface InvokeStreamParams {
  accessToken: string
  attachments?: AttachmentInput[]
  message: string
  requestId: string
  signal: AbortSignal
  sessionId: string
}

const useDirectAgentCoreEnvValue = 'true'
const minimumAgentCoreSessionIdLength = 33
const agentCoreSessionIdPrefix = 'cei-session-'
const agentCoreSessionIdHeader = 'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'

const errorPayloadSchema = z
  .object({
    code: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough()

const directInvokeRequestSchema = invokeRequestSchema.omit({ sessionId: true })

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown stream error'
}

function shouldUseDirectAgentCore(): boolean {
  return import.meta.env.VITE_USE_DIRECT_AGENTCORE === useDirectAgentCoreEnvValue
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

function buildDirectAgentCoreUrl(region: string, runtimeArn: string): string {
  const encodedArn = encodeURIComponent(runtimeArn)
  return `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodedArn}/invocations?qualifier=DEFAULT`
}

function normalizeAgentCoreSessionId(rawSessionId: string): string {
  const trimmedSessionId = rawSessionId.trim()

  if (trimmedSessionId.length >= minimumAgentCoreSessionIdLength) {
    return trimmedSessionId
  }

  const prefixedSessionId = `${agentCoreSessionIdPrefix}${trimmedSessionId || 'default'}`

  if (prefixedSessionId.length >= minimumAgentCoreSessionIdLength) {
    return prefixedSessionId
  }

  return prefixedSessionId.padEnd(minimumAgentCoreSessionIdLength, '0')
}

async function buildHttpErrorEvent(response: Response): Promise<StreamEvent> {
  let defaultCode = 'http_error'
  if (response.status === 401) {
    defaultCode = 'auth_error'
  } else if (response.status === 403) {
    defaultCode = 'forbidden_error'
  }

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
  let eventType: string | null = null

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue
    }

    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim().toLowerCase()
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) {
    // event-only completion signal (no data payload)
    if (eventType === 'done' || eventType === 'complete') {
      return { type: 'done' }
    }
    return null
  }

  const payload = dataLines.join('\n').trim()

  if (!payload) {
    if (eventType === 'done' || eventType === 'complete') {
      return { type: 'done' }
    }
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

function isContentStreamEvent(streamEvent: StreamEvent): boolean {
  return streamEvent.type !== 'done' && streamEvent.type !== 'error'
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
  const requestInputs: InvokeRequest['inputs'] = {
    message: params.message,
    requestId: params.requestId,
  }

  if ((params.attachments || []).length > 0) {
    requestInputs.attachments = params.attachments
  }

  const shouldUseDirect = shouldUseDirectAgentCore()
  let requestBody: InvokeRequest | DirectInvokeRequest
  let requestUrl = ''
  let headers: Record<string, string> = {}

  if (shouldUseDirect) {
    const runtimeArn = import.meta.env.VITE_AGENT_RUNTIME_ARN || ''
    const region = import.meta.env.VITE_AGENTCORE_REGION || ''

    if (!runtimeArn || !region) {
      yield {
        type: 'error',
        code: 'configuration_error',
        message:
          'Missing VITE_AGENT_RUNTIME_ARN or VITE_AGENTCORE_REGION in environment configuration',
      }
      return
    }

    requestUrl = buildDirectAgentCoreUrl(region, runtimeArn)
    requestBody = directInvokeRequestSchema.parse({
      action: 'invoke',
      stream: true,
      inputs: requestInputs,
    })

    headers = {
      Authorization: `Bearer ${params.accessToken}`,
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      [agentCoreSessionIdHeader]: normalizeAgentCoreSessionId(params.sessionId),
    }
  } else {
    const apiBaseUrl = import.meta.env.VITE_API_URL || ''

    if (!apiBaseUrl) {
      yield {
        type: 'error',
        code: 'configuration_error',
        message: 'Missing VITE_API_URL in environment configuration',
      }
      return
    }

    requestUrl = buildInvokeUrl(apiBaseUrl)
    requestBody = invokeRequestSchema.parse({
      action: 'invoke',
      stream: true,
      sessionId: params.sessionId,
      inputs: requestInputs,
    })

    headers = {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
      'X-Request-Id': params.requestId,
    }
  }

  let response: Response

  try {
    response = await fetch(requestUrl, {
      method: 'POST',
      headers,
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
  let didReceiveError = false
  let didReceiveContent = false

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

      if (streamEvent.type === 'error') {
        didReceiveError = true
      }

      if (isContentStreamEvent(streamEvent)) {
        didReceiveContent = true
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

  if (!didReceiveDone && !didReceiveError && !params.signal.aborted) {
    if (didReceiveContent) {
      yield { type: 'done' }
      return
    }

    yield {
      type: 'error',
      code: 'stream_interrupted',
      message: 'The response stream ended before completion.',
    }
  }
}
