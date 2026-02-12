import type { RoadmapItemsResponse } from './types'

/**
 * Fetches roadmap items from the agent runtime REST endpoint.
 *
 * @param accessToken - Bearer token for authentication
 * @returns Roadmap items response
 */
export async function fetchRoadmapItems(accessToken: string): Promise<RoadmapItemsResponse> {
  const baseUrl = (
    import.meta.env.VITE_ROADMAP_API_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).replace(/\/$/, '')

  if (!baseUrl) {
    throw new Error('Missing VITE_API_URL or VITE_ROADMAP_API_URL in environment configuration')
  }

  const response = await fetch(`${baseUrl}/v1/roadmap/items`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch roadmap items: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as RoadmapItemsResponse

  if (!data || !Array.isArray(data.items)) {
    throw new Error('Invalid roadmap response: expected { items: RoadmapItem[] }')
  }

  return data
}
