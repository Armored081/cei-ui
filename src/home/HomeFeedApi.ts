import { ZodError } from 'zod'

import type { CuratedFeed } from './feedSchema'
import { curatedFeedSchema } from './feedSchema'

const agentCoreSessionIdPrefix = 'cei-session-'
const minimumSessionIdLength = 33

function readApiBaseUrl(): string {
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  if (!baseUrl) {
    throw new Error('Missing VITE_API_URL in environment configuration')
  }

  return baseUrl
}

function shouldUseDirectAgentCore(): boolean {
  return import.meta.env.VITE_USE_DIRECT_AGENTCORE === 'true'
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
  const base = `${agentCoreSessionIdPrefix}home-feed-${Date.now()}`
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

function parseCuratedFeed(payload: unknown): CuratedFeed {
  try {
    const wrappedFeed = (payload as { feed?: unknown })?.feed

    if (wrappedFeed !== undefined) {
      return curatedFeedSchema.parse(wrappedFeed)
    }

    return curatedFeedSchema.parse(payload)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        `Invalid home feed response: ${error.issues[0]?.message || 'schema mismatch'}`,
      )
    }

    throw error
  }
}

/**
 * Fetches curated home feed candidates from the agent.
 *
 * In direct AgentCore mode, calls the AgentCore HTTP endpoint with a Bearer
 * (Cognito ID) token. Otherwise falls back to the Lambda proxy.
 *
 * @param accessToken - Cognito ID token (direct mode) or access token (proxy mode)
 * @returns Validated curated feed payload
 */
export async function fetchHomeFeed(accessToken: string): Promise<CuratedFeed> {
  const useDirect = shouldUseDirectAgentCore()
  const url = useDirect ? buildDirectAgentCoreUrl() : `${readApiBaseUrl()}/invoke`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (useDirect) {
    headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'] = generateSessionId()
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'home_feed',
      inputs: {
        role: 'ciso',
        tenantId: 'default',
      },
      stream: false,
    }),
  })

  if (!response.ok) {
    const details = await readErrorMessage(response)
    throw new Error(`Failed to fetch home feed: ${details}`)
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    throw new Error('Failed to fetch home feed: response was not valid JSON')
  }

  return parseCuratedFeed(payload)
}
