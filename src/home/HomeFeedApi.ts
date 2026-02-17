import { ZodError } from 'zod'

import type { CuratedFeed } from './feedSchema'
import { curatedFeedSchema } from './feedSchema'

function readApiBaseUrl(): string {
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  if (!baseUrl) {
    throw new Error('Missing VITE_API_URL in environment configuration')
  }

  return baseUrl
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
 * Fetches curated home feed candidates from the agent proxy invoke endpoint.
 *
 * @param accessToken - Bearer token used by the API proxy
 * @returns Validated curated feed payload
 */
export async function fetchHomeFeed(accessToken: string): Promise<CuratedFeed> {
  const baseUrl = readApiBaseUrl()
  const response = await fetch(`${baseUrl}/invoke`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      action: 'home_feed',
      inputs: {
        role: 'ciso',
      },
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
