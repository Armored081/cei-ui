import type {
  FeedbackCategory,
  FeedbackCreateResponse,
  FeedbackListResponse,
  FeedbackStatus,
  FeedbackSubmission,
  FeedbackUpdateResponse,
} from './types'

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
    const payload = (await response.json()) as { error?: unknown; message?: unknown }
    const message =
      (typeof payload.message === 'string' && payload.message) ||
      (typeof payload.error === 'string' && payload.error) ||
      ''

    if (message) {
      return message
    }
  } catch {
    // Ignore JSON parsing errors and fallback to status text.
  }

  return `${response.status} ${response.statusText}`.trim()
}

function buildAuthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'x-user-id': readUserIdFromToken(accessToken),
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
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !Array.isArray((payload as FeedbackListResponse).items)
  ) {
    throw new Error(
      'Invalid feedback list response: expected { items: FeedbackItem[], nextCursor }',
    )
  }

  const nextCursor = (payload as FeedbackListResponse).nextCursor
  if (nextCursor !== null && typeof nextCursor !== 'string') {
    throw new Error('Invalid feedback list response: nextCursor must be string or null')
  }

  return payload as FeedbackListResponse
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

  return assertFeedbackCreateResponse(await response.json())
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

  return assertFeedbackListResponse(await response.json())
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

  return assertFeedbackListResponse(await response.json())
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

  return assertFeedbackUpdateResponse(await response.json())
}
