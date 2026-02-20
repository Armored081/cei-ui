import type { ArtifactConfidence } from '../types/chat'
import type { StoryCard as ModernContextStoryCard } from '../types/modern-context'

export type HomeSeverity = 'red' | 'amber'
export type ThresholdDirection = 'above' | 'below'

/** Agent-curated item shown in the Attention Needed section. */
export interface HomeAgenticItem {
  confidence: ArtifactConfidence
  correlatedEntities?: ModernContextStoryCard['correlatedEntities']
  id: string
  severity: HomeSeverity
  summary: string
  temporalWindow?: ModernContextStoryCard['temporalWindow']
  title: string
}

/** Threshold definition used to color deterministic metrics. */
export interface HomeMetricThreshold {
  amber: number
  direction: ThresholdDirection
  red: number
}

/** Deterministic metric card item shown in Metrics at a Glance. */
export interface HomeMetricItem {
  id: string
  label: string
  previousValue: number
  threshold: HomeMetricThreshold
  value: number
  valueDisplay: string
}
