import type { ArtifactConfidence } from '../components/ChatMessageList'

export type HomeSeverity = 'red' | 'amber'
export type ThresholdDirection = 'above' | 'below'

/**
 * Agent-curated item shown in the Attention Needed section.
 */
export interface HomeAgenticItem {
  confidence: ArtifactConfidence
  id: string
  severity: HomeSeverity
  summary: string
  title: string
}

/**
 * Threshold definition used to color deterministic metrics.
 */
export interface HomeMetricThreshold {
  amber: number
  direction: ThresholdDirection
  red: number
}

/**
 * Deterministic metric card item shown in Metrics at a Glance.
 */
export interface HomeMetricItem {
  id: string
  label: string
  previousValue: number
  threshold: HomeMetricThreshold
  value: number
  valueDisplay: string
}

/**
 * Home feed shape used in Phase H1 until the live feed API is wired.
 */
export interface HomeMockFeed {
  agenticItems: HomeAgenticItem[]
  metricItems: HomeMetricItem[]
}

const DEV_HOME_FEED: HomeMockFeed = {
  agenticItems: [
    {
      id: 'agentic-vektora-nis2-gap',
      severity: 'red',
      title: 'Vektora NIS2 logging coverage gap needs executive review',
      summary:
        'Privileged access logging controls remain below NIS2 minimum expectations across two production domains.',
      confidence: 'high',
    },
    {
      id: 'agentic-gridnova-supplier-decision',
      severity: 'amber',
      title: 'Agent decision pending for GridNova supplier attestations',
      summary:
        'Three GridNova suppliers submitted incomplete control attestations and need acceptance or remediation direction.',
      confidence: 'medium',
    },
    {
      id: 'agentic-feb-operating-review',
      severity: 'amber',
      title: 'February operating review packet requires sign-off',
      summary:
        'The monthly operating review is assembled and waiting for leadership validation before distribution.',
      confidence: 'low',
    },
  ],
  metricItems: [
    {
      id: 'metric-ot-findings',
      label: 'OT findings count',
      value: 12,
      valueDisplay: '12',
      previousValue: 9,
      threshold: {
        direction: 'above',
        amber: 8,
        red: 11,
      },
    },
    {
      id: 'metric-it-ot-segmentation',
      label: 'IT/OT segmentation %',
      value: 91,
      valueDisplay: '91%',
      previousValue: 88,
      threshold: {
        direction: 'below',
        amber: 90,
        red: 85,
      },
    },
    {
      id: 'metric-vendor-coverage',
      label: 'Vendor coverage %',
      value: 76,
      valueDisplay: '76%',
      previousValue: 81,
      threshold: {
        direction: 'below',
        amber: 80,
        red: 70,
      },
    },
  ],
}

/**
 * Returns development mock feed data. Production builds intentionally return empty arrays.
 */
export function getMockFeedData(): HomeMockFeed {
  if (!import.meta.env.DEV) {
    return {
      agenticItems: [],
      metricItems: [],
    }
  }

  return DEV_HOME_FEED
}
