import { describe, expect, it } from 'vitest'

import { invokeRequestSchema, structuredBlockSchema } from './types'

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
