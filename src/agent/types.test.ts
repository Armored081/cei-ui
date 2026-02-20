import { describe, expect, it } from 'vitest'

import { invokeRequestSchema, streamEventSchema, structuredBlockSchema } from './types'

describe('structuredBlockSchema chart validation', (): void => {
  it('accepts existing single-series charts unchanged', (): void => {
    const result = structuredBlockSchema.parse({
      chartType: 'bar',
      data: [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ],
      kind: 'chart',
      title: 'Single series',
    })

    expect(result).toMatchObject({
      chartType: 'bar',
      kind: 'chart',
      title: 'Single series',
    })
  })

  it.each(['stacked-bar', 'grouped-bar', 'multi-line', 'stacked-area'] as const)(
    'accepts %s as a chartType with multi-series data',
    (chartType): void => {
      const result = structuredBlockSchema.parse({
        chartType,
        data: [
          { Cost: 80, Revenue: 120, label: 'Q1' },
          { Cost: 85, Revenue: 135, label: 'Q2' },
        ],
        kind: 'chart',
        series: ['Revenue', 'Cost'],
        title: 'Quarterly trend',
      })

      expect(result).toMatchObject({
        chartType,
        kind: 'chart',
      })
    },
  )

  it('accepts optional color overrides', (): void => {
    const result = structuredBlockSchema.parse({
      chartType: 'multi-line',
      colors: ['#ff0000', '#00ff00', '#0000ff'],
      data: [
        { Cost: 80, Revenue: 120, label: 'Q1' },
        { Cost: 85, Revenue: 135, label: 'Q2' },
      ],
      kind: 'chart',
      series: ['Revenue', 'Cost'],
      title: 'Custom colors',
    })

    expect(result).toMatchObject({
      chartType: 'multi-line',
      colors: ['#ff0000', '#00ff00', '#0000ff'],
      kind: 'chart',
    })
  })

  it('rejects multi-series data points containing unsupported value types', (): void => {
    const parsed = structuredBlockSchema.safeParse({
      chartType: 'stacked-bar',
      data: [{ Cost: true, Revenue: 120, label: 'Q1' }],
      kind: 'chart',
      series: ['Revenue', 'Cost'],
      title: 'Invalid values',
    })

    expect(parsed.success).toBe(false)
  })
})

describe('structuredBlockSchema assessment artifact validation', (): void => {
  it('accepts assessment-list blocks', (): void => {
    const parsed = structuredBlockSchema.parse({
      kind: 'assessment-list',
      title: 'Assessments',
      assessments: [
        {
          id: 'assess-1',
          name: 'SOC 2 Type II Review',
          framework: 'SOC 2',
          status: 'in-progress',
          score: 78.5,
          updatedAt: '2026-02-10T17:12:00.000Z',
        },
      ],
    })

    expect(parsed).toMatchObject({
      kind: 'assessment-list',
      title: 'Assessments',
    })
  })

  it('accepts assessment-detail blocks', (): void => {
    const parsed = structuredBlockSchema.parse({
      kind: 'assessment-detail',
      title: 'Assessment Detail',
      assessment: {
        id: 'assess-2',
        name: 'ISO 27001 Control Review',
        framework: 'ISO 27001',
        status: 'complete',
        score: 91,
        updatedAt: '2026-02-11T09:45:00.000Z',
        sections: [
          {
            name: 'Access Control',
            score: 88,
            controls: [
              {
                id: 'AC-1',
                description: 'Access provisioning is documented',
                status: 'mapped',
                gap: '',
                recommendation: '',
              },
            ],
          },
        ],
      },
    })

    expect(parsed).toMatchObject({
      kind: 'assessment-detail',
      title: 'Assessment Detail',
    })
  })
})

describe('invokeRequestSchema attachments', (): void => {
  it('accepts invoke inputs with attachments', (): void => {
    const parsed = invokeRequestSchema.parse({
      action: 'invoke',
      inputs: {
        attachments: [
          {
            data: 'c29tZSBiYXNlNjQ=',
            mime: 'text/plain',
            name: 'notes.txt',
            sizeBytes: 12,
          },
        ],
        message: 'Analyze attached file',
        requestId: 'req-1',
      },
      sessionId: 'session-1',
      stream: true,
    })

    expect(parsed.inputs.attachments).toHaveLength(1)
  })

  it('rejects more than three attachments', (): void => {
    const parsed = invokeRequestSchema.safeParse({
      action: 'invoke',
      inputs: {
        attachments: [
          { data: 'a', mime: 'text/plain', name: '1.txt', sizeBytes: 1 },
          { data: 'b', mime: 'text/plain', name: '2.txt', sizeBytes: 1 },
          { data: 'c', mime: 'text/plain', name: '3.txt', sizeBytes: 1 },
          { data: 'd', mime: 'text/plain', name: '4.txt', sizeBytes: 1 },
        ],
        message: 'Analyze attached files',
        requestId: 'req-2',
      },
      sessionId: 'session-2',
      stream: true,
    })

    expect(parsed.success).toBe(false)
  })
})

describe('streamEventSchema agent metadata extensions', (): void => {
  it('accepts block events with optional confidence and reasoning metadata', (): void => {
    const parsed = streamEventSchema.parse({
      type: 'block',
      confidence: 'high',
      confidenceDecay: '2026-02-12T10:00:00.000Z',
      reasoning: 'Evidence from IAM scan and policy drift analysis.',
      block: {
        kind: 'recommendation',
        severity: 'high',
        title: 'Require MFA for all admins',
        body: 'Enable MFA and enforce policy controls.',
      },
    })

    expect(parsed).toMatchObject({
      type: 'block',
      confidence: 'high',
      confidenceDecay: '2026-02-12T10:00:00.000Z',
    })
  })

  it('accepts task-progress events', (): void => {
    const parsed = streamEventSchema.parse({
      type: 'task-progress',
      taskName: 'Generating remediation plan',
      totalSteps: 5,
      completedSteps: 2,
      currentStep: 'Correlating findings',
      steps: [
        { name: 'Load findings', status: 'complete' },
        { name: 'Correlate findings', status: 'active' },
        { name: 'Draft remediation', status: 'pending' },
      ],
    })

    expect(parsed).toMatchObject({
      type: 'task-progress',
      taskName: 'Generating remediation plan',
      completedSteps: 2,
    })
  })
})

describe('structuredBlockSchema story-card validation', (): void => {
  it('accepts story-card blocks with all fields', (): void => {
    const parsed = structuredBlockSchema.parse({
      kind: 'story-card',
      storyCardId: 'story-1',
      title: 'Credential Exposure in Production',
      severity: 'critical',
      narrative: 'Multiple AWS IAM keys discovered in public repositories.',
      temporalWindow: {
        start: '2026-02-15T00:00:00Z',
        end: '2026-02-20T00:00:00Z',
      },
      correlatedEntities: [
        { type: 'finding', id: 'finding-1', name: 'Exposed API Key' },
        { type: 'asset', id: 'asset-1', name: 'Production S3 Bucket' },
      ],
    })

    expect(parsed).toMatchObject({
      kind: 'story-card',
      storyCardId: 'story-1',
      severity: 'critical',
    })
  })

  it('accepts story-card blocks with minimal fields', (): void => {
    const parsed = structuredBlockSchema.parse({
      kind: 'story-card',
      storyCardId: 'story-2',
      title: 'Policy Drift Detected',
      severity: 'medium',
    })

    expect(parsed).toMatchObject({
      kind: 'story-card',
      storyCardId: 'story-2',
      severity: 'medium',
    })
  })

  it('rejects story-card blocks with malformed correlatedEntities', (): void => {
    const parsed = structuredBlockSchema.safeParse({
      kind: 'story-card',
      storyCardId: 'story-3',
      title: 'Test Story',
      severity: 'low',
      correlatedEntities: [
        { type: 'risk', id: 'risk-1' }, // missing 'name' field
      ],
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects story-card blocks with invalid correlatedEntities (null values)', (): void => {
    const parsed = structuredBlockSchema.safeParse({
      kind: 'story-card',
      storyCardId: 'story-4',
      title: 'Test Story',
      severity: 'info',
      correlatedEntities: [null],
    })

    expect(parsed.success).toBe(false)
  })
})

describe('streamEventSchema modern-context events', (): void => {
  const validModernContext = {
    storyCards: [],
    entityGraph: {
      nodes: [
        {
          type: 'risk',
          id: 'risk-1',
          name: 'Credential Exposure',
        },
      ],
      edges: [],
    },
    vizHints: [],
    pivotTargets: [],
  } as const

  it('parses a modern-context stream event with valid modernContext payload', (): void => {
    const parsed = streamEventSchema.safeParse({
      type: 'modern-context',
      modernContext: validModernContext,
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts modern-context stream event even when modernContext payload is invalid (validated downstream)', (): void => {
    const parsed = streamEventSchema.safeParse({
      type: 'modern-context',
      modernContext: {
        storyCards: [],
        entityGraph: {
          nodes: [{ type: 'not-real', id: 'bad', name: 'Bad' }],
          edges: [],
        },
        vizHints: [],
        pivotTargets: [],
      },
    })

    // Transport layer accepts z.unknown() to avoid stream termination on malformed metadata
    // Actual validation happens in useChatEngine via safeParse for graceful degradation
    expect(parsed.success).toBe(true)
  })

  it('parses done event when optional modernContext is present', (): void => {
    const parsed = streamEventSchema.safeParse({
      type: 'done',
      summary: 'Complete',
      modernContext: validModernContext,
    })

    expect(parsed.success).toBe(true)
  })

  it('parses done event without modernContext for backward compatibility', (): void => {
    const parsed = streamEventSchema.safeParse({
      type: 'done',
      summary: 'Complete',
    })

    expect(parsed.success).toBe(true)
  })
})
