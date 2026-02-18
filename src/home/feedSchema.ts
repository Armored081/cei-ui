import { z } from 'zod'

const artifactConfidenceSchema = z
  .enum(['high', 'medium', 'low', 'unknown', 'verified', 'stale'])
  .transform((value) => {
    if (value === 'verified') {
      return 'high' as const
    }

    if (value === 'stale') {
      return 'low' as const
    }

    return value as 'high' | 'medium' | 'low' | 'unknown'
  })

export const feedCandidateSchema = z.object({
  id: z.string(),
  type: z.enum(['agentic', 'deterministic']),
  category: z.string(),
  agentDomain: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  confidence: artifactConfidenceSchema,
  significanceScore: z.number(),
  metricId: z.string().optional(),
  entityId: z.string().optional(),
  entityPath: z.union([z.string(), z.array(z.string())]).optional(),
  value: z.number().optional(),
  previousValue: z.number().optional(),
  threshold: z
    .object({
      red: z.number(),
      amber: z.number(),
      direction: z.enum(['above', 'below']),
    })
    .optional(),
  deepLink: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const cadenceStateSchema = z.object({
  currentPeriod: z.string(),
  isReviewWeek: z.boolean(),
  dayOfWeek: z.number(),
  activeTargets: z.number(),
})

export const curatedFeedSchema = z.object({
  agentic: z.array(feedCandidateSchema),
  deterministic: z.array(feedCandidateSchema),
  generatedAt: z.string(),
  cadenceState: cadenceStateSchema,
})

export type FeedCandidate = z.output<typeof feedCandidateSchema>
export type CuratedFeed = z.output<typeof curatedFeedSchema>
export type CadenceState = z.output<typeof cadenceStateSchema>
