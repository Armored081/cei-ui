const useDirectAgentCoreEnvValue = 'true'
const minimumSessionIdLength = 33
const agentCoreSessionIdPrefix = 'cei-session-integrations-'

interface JwtPayload {
  sub?: string
  'cognito:username'?: string
  username?: string
}

/**
 * Health status values returned by integration management APIs.
 */
export type IntegrationHealthStatus = 'healthy' | 'degraded' | 'offline' | 'stale' | 'unknown'

/**
 * Supported integration system categories.
 */
export type IntegrationSystemType =
  | 'grc'
  | 'asset'
  | 'change'
  | 'incident'
  | 'vuln'
  | 'identity'
  | 'siem'
  | 'backup'
  | 'rubrik'

/**
 * Integration record returned by integration APIs.
 */
export interface Integration {
  id: string
  name: string
  systemType: IntegrationSystemType
  config: Record<string, unknown>
  capabilities: string[]
  healthStatus: IntegrationHealthStatus
  lastHealthCheck: string | null
  lastSuccessfulSync: string | null
  syncSchedule: string | null
  realtimeEnabled: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Integration list payload.
 */
export interface IntegrationListResult {
  items: Integration[]
  total: number
}

/**
 * Integration update payload.
 */
export interface IntegrationUpdateResult {
  integration: Integration
}

/**
 * Optional integration filters for listing calls.
 */
export interface IntegrationListFilters {
  systemType?: string
  healthStatus?: string
}

/**
 * Accepted integration updates for enable/disable and scheduling workflows.
 */
export type IntegrationUpdateInput = Partial<
  Pick<Integration, 'healthStatus' | 'syncSchedule' | 'realtimeEnabled'> & {
    config?: Record<string, unknown>
  }
>

function shouldUseDirectAgentCore(): boolean {
  return import.meta.env.VITE_USE_DIRECT_AGENTCORE === useDirectAgentCoreEnvValue
}

function readApiBaseUrl(): string {
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  if (!baseUrl) {
    throw new Error('Missing VITE_API_URL in environment configuration')
  }

  return baseUrl
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
    'x-amzn-bedrock-agentcore-session-id': generateSessionId(),
  }
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

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as unknown
    const details = readErrorMessageFromPayload(payload)

    if (details) {
      return details
    }
  } catch {
    // Ignore response parsing failures and fallback to status text.
  }

  return `${response.status} ${response.statusText}`.trim()
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

const integrationHealthStatuses: IntegrationHealthStatus[] = [
  'healthy',
  'degraded',
  'offline',
  'stale',
  'unknown',
]

const integrationSystemTypes: IntegrationSystemType[] = [
  'grc',
  'asset',
  'change',
  'incident',
  'vuln',
  'identity',
  'siem',
  'backup',
  'rubrik',
]

function isHealthStatus(value: unknown): value is IntegrationHealthStatus {
  return (
    typeof value === 'string' &&
    integrationHealthStatuses.includes(value as IntegrationHealthStatus)
  )
}

function isSystemType(value: unknown): value is IntegrationSystemType {
  return (
    typeof value === 'string' && integrationSystemTypes.includes(value as IntegrationSystemType)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertIntegration(payload: unknown): Integration {
  if (!isRecord(payload)) {
    throw new Error('Invalid integration payload: expected object')
  }

  const candidate = payload as Record<string, unknown>

  if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
    throw new Error('Invalid integration payload: missing id')
  }

  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    throw new Error('Invalid integration payload: missing name')
  }

  if (!isSystemType(candidate.systemType)) {
    throw new Error('Invalid integration payload: invalid systemType')
  }

  if (!isRecord(candidate.config)) {
    throw new Error('Invalid integration payload: config must be an object')
  }

  if (!Array.isArray(candidate.capabilities)) {
    throw new Error('Invalid integration payload: capabilities must be an array')
  }

  const capabilities = candidate.capabilities.filter(
    (entry: unknown): entry is string => typeof entry === 'string',
  )

  if (capabilities.length !== candidate.capabilities.length) {
    throw new Error('Invalid integration payload: capabilities must contain strings only')
  }

  if (!isHealthStatus(candidate.healthStatus)) {
    throw new Error('Invalid integration payload: invalid healthStatus')
  }

  if (candidate.lastHealthCheck !== null && typeof candidate.lastHealthCheck !== 'string') {
    throw new Error('Invalid integration payload: lastHealthCheck must be string or null')
  }

  if (candidate.lastSuccessfulSync !== null && typeof candidate.lastSuccessfulSync !== 'string') {
    throw new Error('Invalid integration payload: lastSuccessfulSync must be string or null')
  }

  if (candidate.syncSchedule !== null && typeof candidate.syncSchedule !== 'string') {
    throw new Error('Invalid integration payload: syncSchedule must be string or null')
  }

  if (typeof candidate.realtimeEnabled !== 'boolean') {
    throw new Error('Invalid integration payload: realtimeEnabled must be boolean')
  }

  if (typeof candidate.createdAt !== 'string' || typeof candidate.updatedAt !== 'string') {
    throw new Error('Invalid integration payload: createdAt and updatedAt must be strings')
  }

  return {
    id: candidate.id,
    name: candidate.name,
    systemType: candidate.systemType,
    config: candidate.config,
    capabilities,
    healthStatus: candidate.healthStatus,
    lastHealthCheck: candidate.lastHealthCheck,
    lastSuccessfulSync: candidate.lastSuccessfulSync,
    syncSchedule: candidate.syncSchedule,
    realtimeEnabled: candidate.realtimeEnabled,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  }
}

function assertIntegrationListResult(payload: unknown): IntegrationListResult {
  if (!isRecord(payload) || !Array.isArray(payload.items) || typeof payload.total !== 'number') {
    throw new Error(
      'Invalid integration list response: expected { items: Integration[], total: number }',
    )
  }

  return {
    items: payload.items.map((entry: unknown): Integration => assertIntegration(entry)),
    total: payload.total,
  }
}

function assertIntegrationUpdateResult(payload: unknown): IntegrationUpdateResult {
  if (!isRecord(payload) || !('integration' in payload)) {
    throw new Error('Invalid integration update response: expected { integration: Integration }')
  }

  return {
    integration: assertIntegration(payload.integration),
  }
}

function buildListEndpoint(baseUrl: string, filters: IntegrationListFilters): string {
  const queryParams = new URLSearchParams()

  if (filters.systemType) {
    queryParams.set('systemType', filters.systemType)
  }

  if (filters.healthStatus) {
    queryParams.set('healthStatus', filters.healthStatus)
  }

  const queryString = queryParams.toString()
  return queryString ? `${baseUrl}/v1/integrations?${queryString}` : `${baseUrl}/v1/integrations`
}

function buildListInputs(filters: IntegrationListFilters): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}

  if (filters.systemType) {
    inputs.systemType = filters.systemType
  }

  if (filters.healthStatus) {
    inputs.healthStatus = filters.healthStatus
  }

  return inputs
}

function buildUpdatePayload(
  integrationId: string,
  updates: IntegrationUpdateInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    integrationId,
  }

  if (updates.healthStatus) {
    payload.healthStatus = updates.healthStatus
  }

  if ('syncSchedule' in updates) {
    payload.syncSchedule = updates.syncSchedule ?? null
  }

  if ('realtimeEnabled' in updates && typeof updates.realtimeEnabled === 'boolean') {
    payload.realtimeEnabled = updates.realtimeEnabled
  }

  if ('config' in updates && updates.config && isRecord(updates.config)) {
    payload.config = updates.config
  }

  return payload
}

async function invokeIntegrationAction(
  accessToken: string,
  action: 'integration_list' | 'integration_update',
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
    throw new Error(`Failed to invoke integration action "${action}": ${details}`)
  }

  const payload = await readJsonPayload(response, `Failed to invoke integration action "${action}"`)
  return resolveInvocationResponsePayload(payload, action)
}

/**
 * Lists integrations for the authenticated admin user.
 *
 * @param accessToken - Bearer token used for authorization
 * @param filters - Optional integration list filters
 * @returns Integration list with total count
 */
export async function listIntegrations(
  accessToken: string,
  filters: IntegrationListFilters = {},
): Promise<IntegrationListResult> {
  if (shouldUseDirectAgentCore()) {
    const payload = await invokeIntegrationAction(
      accessToken,
      'integration_list',
      buildListInputs(filters),
    )

    return assertIntegrationListResult(payload)
  }

  const baseUrl = readApiBaseUrl()
  const endpoint = buildListEndpoint(baseUrl, filters)
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  })

  if (!response.ok) {
    const details = await readErrorMessage(response)
    throw new Error(`Failed to list integrations: ${details}`)
  }

  return assertIntegrationListResult(await readJsonPayload(response, 'Failed to list integrations'))
}

/**
 * Updates mutable integration configuration fields.
 *
 * @param accessToken - Bearer token used for authorization
 * @param integrationId - Integration identifier to update
 * @param updates - Partial set of mutable fields to update
 * @returns Updated integration record
 */
export async function updateIntegration(
  accessToken: string,
  integrationId: string,
  updates: IntegrationUpdateInput,
): Promise<IntegrationUpdateResult> {
  if (shouldUseDirectAgentCore()) {
    const payload = await invokeIntegrationAction(
      accessToken,
      'integration_update',
      buildUpdatePayload(integrationId, updates),
    )

    return assertIntegrationUpdateResult(payload)
  }

  const baseUrl = readApiBaseUrl()
  const response = await fetch(`${baseUrl}/v1/integrations/${encodeURIComponent(integrationId)}`, {
    method: 'PATCH',
    headers: {
      ...buildAuthHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const details = await readErrorMessage(response)
    throw new Error(`Failed to update integration: ${details}`)
  }

  return assertIntegrationUpdateResult(
    await readJsonPayload(response, 'Failed to update integration'),
  )
}
