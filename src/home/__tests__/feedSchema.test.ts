import { ZodError } from 'zod'
import { describe, expect, it } from 'vitest'

import { curatedFeedSchema, feedCandidateSchema } from '../feedSchema'

const BASE_CANDIDATE = {
  id: 'candidate-1',
  type: 'agentic' as const,
  category: 'compliance',
  title: 'Coverage gap detected',
  summary: 'Logging coverage dropped below target.',
  confidence: 'high' as const,
  significanceScore: 0.9,
}

const BASE_FEED = {
  agentic: [BASE_CANDIDATE],
  deterministic: [],
  generatedAt: '2026-02-17T08:00:00.000Z',
  cadenceState: {
    currentPeriod: '2026-W07',
    isReviewWeek: false,
    dayOfWeek: 2,
    activeTargets: 4,
  },
}

describe('feedSchema', (): void => {
  it('parses a valid curated feed without transforming standard confidence values', (): void => {
    const parsed = curatedFeedSchema.parse(BASE_FEED)

    expect(parsed.agentic[0].confidence).toBe('high')
    expect(parsed.generatedAt).toBe('2026-02-17T08:00:00.000Z')
  })

  it('maps verified confidence to high', (): void => {
    const parsed = feedCandidateSchema.parse({
      ...BASE_CANDIDATE,
      confidence: 'verified',
    })

    expect(parsed.confidence).toBe('high')
  })

  it('maps stale confidence to low', (): void => {
    const parsed = feedCandidateSchema.parse({
      ...BASE_CANDIDATE,
      confidence: 'stale',
    })

    expect(parsed.confidence).toBe('low')
  })

  it('omits optional fields when they are not present', (): void => {
    const parsed = feedCandidateSchema.parse(BASE_CANDIDATE)

    expect(parsed.metricId).toBeUndefined()
    expect(parsed.entityId).toBeUndefined()
    expect(parsed.threshold).toBeUndefined()
  })

  it('throws a ZodError for an invalid candidate shape', (): void => {
    expect((): void => {
      feedCandidateSchema.parse({
        ...BASE_CANDIDATE,
        title: 123,
      })
    }).toThrow(ZodError)
  })

  it('accepts nested threshold values when direction is valid', (): void => {
    const parsed = feedCandidateSchema.parse({
      ...BASE_CANDIDATE,
      type: 'deterministic',
      threshold: {
        amber: 70,
        red: 90,
        direction: 'above',
      },
    })

    expect(parsed.threshold).toEqual({
      amber: 70,
      red: 90,
      direction: 'above',
    })
  })

  it('rejects nested threshold values when direction is invalid', (): void => {
    expect((): void => {
      feedCandidateSchema.parse({
        ...BASE_CANDIDATE,
        threshold: {
          amber: 50,
          red: 75,
          direction: 'sideways',
        },
      })
    }).toThrow(ZodError)
  })

  it('accepts metadata records with unknown nested payloads', (): void => {
    const parsed = feedCandidateSchema.parse({
      ...BASE_CANDIDATE,
      metadata: {
        controlIds: ['AC-2', 'AC-6'],
        owner: {
          name: 'Platform Security',
        },
      },
    })

    expect(parsed.metadata?.owner).toEqual({ name: 'Platform Security' })
  })
})
