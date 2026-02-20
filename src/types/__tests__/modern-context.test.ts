import { describe, expect, it } from 'vitest'

import {
  entityGraphSchema,
  modernContextSchema,
  pivotTargetSchema,
  storyCardSchema,
  vizHintSchema,
} from '../modern-context.js'

function buildEntityReference(): {
  id: string
  name: string
  type: 'risk'
} {
  return {
    id: 'risk-1',
    name: 'Credential Exposure Risk',
    type: 'risk',
  }
}

function buildValidModernContext(): {
  storyCards: Array<{
    id: string
    title: string
    severity: 'high'
    narrative: string
    correlatedEntities: Array<{ id: string; name: string; type: 'risk' }>
    temporalWindow: { startDate: string; endDate: string }
    triggerMetrics: string[]
    recommendedActions: string[]
  }>
  entityGraph: {
    nodes: Array<{ id: string; name: string; type: 'risk' }>
    edges: Array<{
      source: { id: string; name: string; type: 'risk' }
      target: { id: string; name: string; type: 'risk' }
      relationshipType: string
      weight: number
    }>
    groups: Array<{
      id: string
      label: string
      category: string
      nodeIds: string[]
    }>
  }
  vizHints: Array<{
    chartType: 'timeline'
    title: string
    dataKeys: string[]
    groupBy: string
    description: string
  }>
  pivotTargets: Array<{
    entity: { id: string; name: string; type: 'risk' }
    suggestedAction: string
    targetUseCase: string
  }>
} {
  const entity = buildEntityReference()

  return {
    storyCards: [
      {
        id: 'story-1',
        title: 'Escalating IAM exception trend',
        severity: 'high',
        narrative: 'Access exceptions rose across privileged roles over the last 7 days.',
        correlatedEntities: [entity],
        temporalWindow: {
          startDate: '2026-02-01',
          endDate: '2026-02-08',
        },
        triggerMetrics: ['privileged_exception_rate'],
        recommendedActions: ['Enforce temporary approval workflow'],
      },
    ],
    entityGraph: {
      nodes: [entity],
      edges: [
        {
          source: entity,
          target: entity,
          relationshipType: 'correlates_with',
          weight: 0.92,
        },
      ],
      groups: [
        {
          id: 'group-1',
          label: 'High Risk',
          category: 'risk-cluster',
          nodeIds: ['risk-1'],
        },
      ],
    },
    vizHints: [
      {
        chartType: 'timeline',
        title: 'Exception trend',
        dataKeys: ['count'],
        groupBy: 'day',
        description: 'Daily trend of IAM exceptions',
      },
    ],
    pivotTargets: [
      {
        entity,
        suggestedAction: 'Open control review workflow',
        targetUseCase: 'iam-governance',
      },
    ],
  }
}

describe('modernContextSchema', (): void => {
  it('parses a full valid ModernContext payload', (): void => {
    const parsed = modernContextSchema.safeParse(buildValidModernContext())

    expect(parsed.success).toBe(true)
  })

  it('accepts empty arrays for storyCards, vizHints, and pivotTargets', (): void => {
    const parsed = modernContextSchema.safeParse({
      storyCards: [],
      entityGraph: {
        nodes: [],
        edges: [],
      },
      vizHints: [],
      pivotTargets: [],
    })

    expect(parsed.success).toBe(true)
  })

  it('fails validation for invalid entity types', (): void => {
    const payload = buildValidModernContext()

    const parsed = modernContextSchema.safeParse({
      ...payload,
      entityGraph: {
        ...payload.entityGraph,
        nodes: [{ id: 'x', name: 'Unknown', type: 'not-a-real-type' }],
      },
    })

    expect(parsed.success).toBe(false)
  })

  it('fails validation when required fields are missing', (): void => {
    const parsed = modernContextSchema.safeParse({
      entityGraph: {
        nodes: [],
        edges: [],
      },
      vizHints: [],
      pivotTargets: [],
    })

    expect(parsed.success).toBe(false)
  })

  it('strips unknown fields from top-level and nested objects', (): void => {
    const parsed = modernContextSchema.parse({
      ...buildValidModernContext(),
      extraTopLevel: 'remove-me',
      storyCards: [
        {
          ...buildValidModernContext().storyCards[0],
          extraCardField: 'remove-me-too',
        },
      ],
    })

    expect(parsed).not.toHaveProperty('extraTopLevel')
    expect(parsed.storyCards[0]).not.toHaveProperty('extraCardField')
  })
})

describe('modern-context sub-schemas', (): void => {
  it('validates storyCardSchema independently', (): void => {
    const parsed = storyCardSchema.safeParse(buildValidModernContext().storyCards[0])

    expect(parsed.success).toBe(true)
  })

  it('validates entityGraphSchema independently', (): void => {
    const parsed = entityGraphSchema.safeParse(buildValidModernContext().entityGraph)

    expect(parsed.success).toBe(true)
  })

  it('validates vizHintSchema independently', (): void => {
    const parsed = vizHintSchema.safeParse(buildValidModernContext().vizHints[0])

    expect(parsed.success).toBe(true)
  })

  it('validates pivotTargetSchema independently', (): void => {
    const parsed = pivotTargetSchema.safeParse(buildValidModernContext().pivotTargets[0])

    expect(parsed.success).toBe(true)
  })
})
