import type { ArtifactConfidence } from '../types/chat'

export type HomeSeverity = 'red' | 'amber'
export type ThresholdDirection = 'above' | 'below'

/** Agent-curated item shown in the Attention Needed section. */
export interface HomeAgenticItem {
  confidence: ArtifactConfidence
  id: string
  severity: HomeSeverity
  summary: string
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
