import { z } from 'zod'

export const chartDataPointSchema = z
  .object({
    label: z.string(),
    value: z.number(),
  })
  .catchall(z.unknown())

const chartColorSchema = z.array(z.string())

// Multi-series data point requires `label` for X-axis
const multiSeriesDataPointSchema = z
  .object({
    label: z.string(),
  })
  .catchall(z.union([z.string(), z.number()]))

// Chart types
const singleSeriesChartTypes = ['bar', 'line', 'pie', 'area'] as const
const multiSeriesChartTypes = ['stacked-bar', 'grouped-bar', 'multi-line', 'stacked-area'] as const

// Unified chart schema with refinement to validate data shape matches chartType
const chartBlockSchema = z
  .object({
    kind: z.literal('chart'),
    chartType: z.enum([...singleSeriesChartTypes, ...multiSeriesChartTypes]),
    title: z.string(),
    data: z.union([z.array(chartDataPointSchema), z.array(multiSeriesDataPointSchema)]),
    series: z.array(z.string()).optional(),
    colors: chartColorSchema.optional(),
  })
  .refine(
    (block) => {
      const isSingleSeries = (singleSeriesChartTypes as readonly string[]).includes(block.chartType)
      const isMultiSeries = (multiSeriesChartTypes as readonly string[]).includes(block.chartType)

      // Single-series charts should have single-series data (with `value` field)
      if (isSingleSeries) {
        return block.data.every((point) => 'value' in point)
      }

      // Multi-series charts should have multi-series data (with `label` field, no `value`)
      if (isMultiSeries) {
        return block.data.every((point) => 'label' in point && !('value' in point))
      }

      return false
    },
    {
      message:
        'Chart data shape must match chartType (single-series requires value field, multi-series requires label without value)',
    },
  )

export const structuredBlockSchema = z.discriminatedUnion('kind', [
  chartBlockSchema,
  z.object({
    kind: z.literal('table'),
    title: z.string(),
    columns: z.array(z.string()),
    rows: z.array(z.record(z.string(), z.unknown())),
  }),
  z.object({
    kind: z.literal('recommendation'),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    title: z.string(),
    body: z.string(),
  }),
])

export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('delta'),
    content: z.string(),
  }),
  z.object({
    type: z.literal('block'),
    block: structuredBlockSchema,
  }),
  z.object({
    type: z.literal('tool_call'),
    name: z.string(),
    args: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('tool_result'),
    name: z.string(),
    result: z.unknown(),
  }),
  z.object({
    type: z.literal('done'),
    summary: z.string().optional(),
  }),
  z.object({
    type: z.literal('error'),
    code: z.string(),
    message: z.string(),
  }),
])

/**
 * Base64-encoded attachment payload for invoke inputs.
 */
export const attachmentInputSchema = z.object({
  name: z.string().min(1),
  mime: z.string().min(1),
  data: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
})

export const invokeRequestSchema = z.object({
  action: z.literal('invoke'),
  stream: z.literal(true),
  sessionId: z.string().min(1),
  inputs: z.object({
    message: z.string().min(1),
    requestId: z.string().min(1),
    attachments: z.array(attachmentInputSchema).max(3).optional(),
  }),
})

export type ChartDataPoint = z.infer<typeof chartDataPointSchema>
export type StructuredBlock = z.infer<typeof structuredBlockSchema>
export type StreamEvent = z.infer<typeof streamEventSchema>
/**
 * Base64-encoded attachment payload for invoke requests.
 */
export type AttachmentInput = z.infer<typeof attachmentInputSchema>
export type InvokeRequest = z.infer<typeof invokeRequestSchema>
export type InvokeResponse = StreamEvent
