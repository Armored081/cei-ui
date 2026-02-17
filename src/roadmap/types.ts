export type RoadmapCategory = 'analysis' | 'integrations' | 'intelligence' | 'platform'
export type RoadmapStatus = 'shipped' | 'in-progress' | 'planned' | 'exploring'
export type RoadmapHorizon = 'now' | 'next' | 'later'

export interface RoadmapItem {
  id: string
  title: string
  description: string
  category: RoadmapCategory
  status: RoadmapStatus
  horizon: RoadmapHorizon
  shipped_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface RoadmapItemsResponse {
  items: RoadmapItem[]
  total: number
}

export const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  analysis: 'Analysis & Reporting',
  integrations: 'Integrations',
  intelligence: 'Agent Intelligence',
  platform: 'Platform',
}

export const STATUS_ICONS: Record<RoadmapStatus, string> = {
  shipped: '✅',
  'in-progress': '🔄',
  planned: '📋',
  exploring: '🔍',
}

export const HORIZON_LABELS: Record<RoadmapHorizon, string> = {
  now: 'Now',
  next: 'Next',
  later: 'Later',
}
