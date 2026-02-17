import type { RoadmapItemsResponse } from './types'

const useDirectAgentCoreEnvValue = 'true'
const minimumSessionIdLength = 33
const agentCoreSessionIdPrefix = 'cei-session-'

function readApiBaseUrl(): string {
  const baseUrl = (
    import.meta.env.VITE_ROADMAP_API_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).replace(/\/$/, '')

  if (!baseUrl) {
    throw new Error('Missing VITE_API_URL or VITE_ROADMAP_API_URL in environment configuration')
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
  const base = `${agentCoreSessionIdPrefix}roadmap-${Date.now()}`
  return base.length >= minimumSessionIdLength ? base : base.padEnd(minimumSessionIdLength, '0')
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

function parseRoadmapResponse(payload: unknown): RoadmapItemsResponse {
  const responsePayload = resolveRoadmapResponsePayload(payload)
  const items = responsePayload.items

  if (!Array.isArray(items)) {
    throw new Error('Invalid roadmap response: expected { items: RoadmapItem[] }')
  }

  const rawTotal = responsePayload.total
  const total =
    typeof rawTotal === 'number' && Number.isFinite(rawTotal)
      ? rawTotal
      : typeof rawTotal === 'string' && rawTotal.trim() && !Number.isNaN(Number(rawTotal))
        ? Number(rawTotal)
        : items.length

  return { items, total }
}

function resolveRoadmapResponsePayload(payload: unknown): {
  items?: unknown
  total?: unknown
} {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  const parsed = payload as { items?: unknown; total?: unknown; result?: unknown }
  if (parsed.result && typeof parsed.result === 'object' && !Array.isArray(parsed.result)) {
    const result = parsed.result as { items?: unknown; total?: unknown }
    if (result.items !== undefined) {
      return result
    }
  }

  return parsed
}

/**
 * Fetches roadmap items from the agent runtime REST endpoint.
 *
 * @param accessToken - Bearer token for authentication
 * @returns Roadmap items response
 */
export async function fetchRoadmapItems(accessToken: string): Promise<RoadmapItemsResponse> {
  const useDirect = shouldUseDirectAgentCore()
  const url = useDirect ? buildDirectAgentCoreUrl() : `${readApiBaseUrl()}/v1/roadmap/items`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  }

  let response: Response

  if (useDirect) {
    headers['Content-Type'] = 'application/json'
    headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'] = generateSessionId()

    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'roadmap_list',
        inputs: {},
        stream: false,
      }),
    })
  } else {
    response = await fetch(url, {
      method: 'GET',
      headers,
    })
  }

  if (!response.ok) {
    const details = await readErrorMessage(response)
    throw new Error(`Failed to fetch roadmap items: ${details}`)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('Failed to fetch roadmap items: response was not valid JSON')
  }

  return parseRoadmapResponse(payload)
}
