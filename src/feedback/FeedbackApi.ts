import type {
  FeedbackCategory,
  FeedbackCreateResponse,
  FeedbackItem,
  FeedbackListResponse,
  FeedbackStatus,
  FeedbackSubmission,
  FeedbackUpdateResponse,
} from './types.js'

const useDirectAgentCoreEnvValue = 'true'
const minimumSessionIdLength = 33
const agentCoreSessionIdPrefix = 'cei-session-feedback-'

interface JwtPayload {
  sub?: string
  'cognito:username'?: string
  username?: string
}

/**
 * Optional filters for listing feedback items.
 */
export interface FeedbackListParams {
  cursor?: string
  limit?: number
  category?: FeedbackCategory
  status?: FeedbackStatus
}

function readApiBaseUrl(): string {
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  if (!baseUrl) {
    throw new Error('Missing VITE_API_URL in environment configuration')
  }

  return baseUrl
}

function shouldUseDirectAgentCore(): boolean {
  return import.meta.env.VITE_USE_DIRECT_AGENTCORE === useDirectAgentCoreEnvValue
}

function buildDirectAgentCoreUrl(): string {
  const region = import.meta.env.VITE_AGENTCORE_REGION || ''
  const runtimeArn = import.meta.env.VITE_AGENT_RUNTIME_ARN || ''

  if (!region || !runtimeArn) {
    throw new Error('Missing VITE_AGENTCORE_REGION or VITE_AGENT_RUNTIME_ARN')
  }

  const encodedArn = encodeURIComponent(runtimeArn)
  return `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodedArn}/invocations?qualifier=cei_dev_endpoint`
}

function generateSessionId(): string {
  const base = `${agentCoreSessionIdPrefix}${Date.now()}`
  return base.length >= minimumSessionIdLength ? base : base.padEnd(minimumSessionIdLength, '0')
}

function decodeBase64Url(encodedValue: string): string {
  const normalizedValue = encodedValue.replace(/-/g, '+').replace(/_/g, '/')
  const remainder = normalizedValue.length % 4
  const paddedValue =
    remainder === 0 ? normalizedValue : `${normalizedValue}${'='.repeat(4 - remainder)}`

  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(paddedValue)
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(paddedValue, 'base64').toString('utf-8')
  }

  throw new Error('Unable to decode JWT payload for x-user-id header')
}

function readUserIdFromToken(accessToken: string): string {
  const tokenParts = accessToken.split('.')

  if (tokenParts.length < 2) {
    throw new Error('Invalid access token: expected JWT format for x-user-id header')
  }

  let payload: JwtPayload

  try {
    const payloadJson = decodeBase64Url(tokenParts[1])
    payload = JSON.parse(payloadJson) as JwtPayload
  } catch {
    throw new Error('Invalid access token: could not parse JWT payload for x-user-id header')
  }

  const userId = payload.sub || payload['cognito:username'] || payload.username || ''

  if (!userId.trim()) {
    throw new Error('Invalid access token: missing subject claim for x-user-id header')
  }

  return userId
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as unknown
    const message = readErrorMessageFromPayload(payload)

    if (message) {
      return message
    }
  } catch {
    // Ignore JSON parsing errors and fallback to status text.
  }

  return `${response.status} ${response.statusText}`.trim()
}

function readErrorMessageFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const parsed = payload as {
    message?: unknown
    error?: unknown
  }

  if (typeof parsed.message === 'string' && parsed.message.trim()) {
    return parsed.message
  }

  if (typeof parsed.error === 'string' && parsed.error.trim()) {
    return parsed.error
  }

  if (parsed.error && typeof parsed.error === 'object' && !Array.isArray(parsed.error)) {
    const nestedError = parsed.error as { code?: unknown; message?: unknown }
    const code = typeof nestedError.code === 'string' ? nestedError.code.trim() : ''
    const message = typeof nestedError.message === 'string' ? nestedError.message.trim() : ''

    if (code && message) {
      return `${code}: ${message}`
    }

    if (message) {
      return message
    }

    if (code) {
      return code
    }
  }

  return ''
}

function buildAuthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'x-user-id': readUserIdFromToken(accessToken),
  }
}

function buildDirectAgentCoreHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': generateSessionId(),
  }
}

function assertFeedbackCreateResponse(payload: unknown): FeedbackCreateResponse {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as FeedbackCreateResponse).id !== 'string' ||
    typeof (payload as FeedbackCreateResponse).status !== 'string'
  ) {
    throw new Error('Invalid feedback create response: expected { id: string, status: string }')
  }

  return payload as FeedbackCreateResponse
}

function assertFeedbackListResponse(payload: unknown): FeedbackListResponse {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error(
      'Invalid feedback list response: expected { items: FeedbackItem[], nextCursor }',
    )
  }

  const candidate = payload as { items?: unknown; nextCursor?: unknown }

  if (!Array.isArray(candidate.items)) {
    throw new Error(
      'Invalid feedback list response: expected { items: FeedbackItem[], nextCursor }',
    )
  }

  const nextCursor = candidate.nextCursor
  if (nextCursor !== undefined && nextCursor !== null && typeof nextCursor !== 'string') {
    throw new Error('Invalid feedback list response: nextCursor must be string or null')
  }

  return {
    items: candidate.items as FeedbackItem[],
    nextCursor: typeof nextCursor === 'string' ? nextCursor : null,
  }
}

function assertFeedbackUpdateResponse(payload: unknown): FeedbackUpdateResponse {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as FeedbackUpdateResponse).id !== 'string' ||
    typeof (payload as FeedbackUpdateResponse).status !== 'string'
  ) {
    throw new Error('Invalid feedback update response: expected { id: string, status: string }')
  }

  return payload as FeedbackUpdateResponse
}

function buildFeedbackListEndpoint(
  baseUrl: string,
  params: FeedbackListParams,
  adminView: boolean,
): string {
  const queryParams = new URLSearchParams()

  if (adminView) {
    queryParams.set('admin', 'true')
  }

  if (params.cursor) {
    queryParams.set('cursor', params.cursor)
  }

  if (typeof params.limit === 'number') {
    queryParams.set('limit', params.limit.toString())
  }

  if (params.category) {
    queryParams.set('category', params.category)
  }

  if (params.status) {
    queryParams.set('status', params.status)
  }

  const queryString = queryParams.toString()

  return queryString ? `${baseUrl}/v1/feedback?${queryString}` : `${baseUrl}/v1/feedback`
}

function buildFeedbackListInputs(params: FeedbackListParams): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}

  if (params.cursor) {
    inputs.cursor = params.cursor
  }

  if (typeof params.limit === 'number') {
    inputs.limit = params.limit
  }

  if (params.category) {
    inputs.category = params.category
  }

  if (params.status) {
    inputs.status = params.status
  }

  return inputs
}

async function readJsonPayload(response: Response, contextMessage: string): Promise<unknown> {
  try {
    return (await response.json()) as unknown
  } catch {
    throw new Error(`${contextMessage}: response was not valid JSON`)
  }
}

function resolveInvocationResponsePayload(payload: unknown, action: string): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const parsed = payload as {
    ok?: unknown
    result?: unknown
  }

  if (parsed.ok === false) {
    const details = readErrorMessageFromPayload(payload)
    throw new Error(details || `AgentCore invocation failed for action "${action}"`)
  }

  if (parsed.result !== undefined) {
    return parsed.result
  }

  return parsed
}

async function invokeFeedbackAction(
  accessToken: string,
  action: 'feedback_create' | 'feedback_list' | 'feedback_update',
  inputs: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(buildDirectAgentCoreUrl(), {
    method: 'POST',
    headers: buildDirectAgentCoreHeaders(accessToken),
    body: JSON.stringify({
      action,
      inputs,
      stream: false,
    }),
  })

  if (!response.ok) {
    const details = await readErrorMessage(response)
    throw new Error(`Failed to invoke feedback action "${action}": ${details}`)
  }

  const payload = await readJsonPayload(response, `Failed to invoke feedback action "${action}"`)
  return resolveInvocationResponsePayload(payload, action)
}

/**
 * Submits a feedback record.
 *
 * @param accessToken - Bearer token for authentication
 * @param submission - Feedback payload to persist
 * @returns Created feedback response payload
 */
export async function submitFeedback(
  accessToken: string,
  submission: FeedbackSubmission,
): Promise<FeedbackCreateResponse> {
  if (shouldUseDirectAgentCore()) {
    const payload = await invokeFeedbackAction(accessToken, 'feedback_create', {
      idempotencyKey: submission.idempotencyKey,
      category: submission.category,
      title: submission.title,
      summary: submission.summary,
      threadContext: submission.threadContext,
    })

    return assertFeedbackCreateResponse(payload)
  }

  const baseUrl = readApiBaseUrl()
  const response = await fetch(`${baseUrl}/v1/feedback`, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submission),
  })

  if (!response.ok) {
    const details = await readErrorMessage(response)
    throw new Error(`Failed to submit feedback: ${details}`)
  }

  return assertFeedbackCreateResponse(await readJsonPayload(response, 'Failed to submit feedback'))
}

/**
 * Lists feedback records for the authenticated user.
 *
 * @param accessToken - Bearer token for authentication
 * @param params - Optional cursor and filter parameters
 * @returns Paginated feedback list
 */
export async function listFeedback(
  accessToken: string,
  params: FeedbackListParams = {},
): Promise<FeedbackListResponse> {
  if (shouldUseDirectAgentCore()) {
    const payload = await invokeFeedbackAction(
      accessToken,
      'feedback_list',
      buildFeedbackListInputs(params),
    )
    return assertFeedbackListResponse(payload)
  }

  const baseUrl = readApiBaseUrl()
  const endpoint = buildFeedbackListEndpoint(baseUrl, params, false)

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  })

  if (!response.ok) {
    const details = await readErrorMessage(response)
    throw new Error(`Failed to list feedback: ${details}`)
  }

  return assertFeedbackListResponse(await readJsonPayload(response, 'Failed to list feedback'))
}

/**
 * Lists feedback records in admin mode across all users.
 *
 * @param accessToken - Bearer token for authentication
 * @param params - Optional cursor and filter parameters
 * @returns Paginated feedback list
 */
export async function listAllFeedback(
  accessToken: string,
  params: FeedbackListParams = {},
): Promise<FeedbackListResponse> {
  if (shouldUseDirectAgentCore()) {
    const payload = await invokeFeedbackAction(
      accessToken,
      'feedback_list',
      buildFeedbackListInputs(params),
    )
    return assertFeedbackListResponse(payload)
  }

  const baseUrl = readApiBaseUrl()
  const endpoint = buildFeedbackListEndpoint(baseUrl, params, true)

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  })

  if (!response.ok) {
    const details = await readErrorMessage(response)
    throw new Error(`Failed to list feedback: ${details}`)
  }

  return assertFeedbackListResponse(await readJsonPayload(response, 'Failed to list feedback'))
}

/**
 * Updates feedback status for triage workflow.
 *
 * @param accessToken - Bearer token for authentication
 * @param id - Feedback identifier
 * @param status - New status value
 * @returns Updated feedback status response payload
 */
export async function updateFeedbackStatus(
  accessToken: string,
  id: string,
  status: FeedbackStatus,
): Promise<FeedbackUpdateResponse> {
  if (shouldUseDirectAgentCore()) {
    const payload = await invokeFeedbackAction(accessToken, 'feedback_update', {
      id,
      status,
    })

    return assertFeedbackUpdateResponse(payload)
  }

  const baseUrl = readApiBaseUrl()
  const response = await fetch(`${baseUrl}/v1/feedback/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      ...buildAuthHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const details = await readErrorMessage(response)
    throw new Error(`Failed to update feedback status: ${details}`)
  }

  return assertFeedbackUpdateResponse(
    await readJsonPayload(response, 'Failed to update feedback status'),
  )
}
