import { z } from 'zod'

export const chartDataPointSchema = z
  .object({
    label: z.string(),
    value: z.number(),
  })
  .catchall(z.unknown())

export const structuredBlockSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('chart'),
    chartType: z.enum(['bar', 'line', 'pie', 'area']),
    title: z.string(),
    data: z.array(chartDataPointSchema),
  }),
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

export const invokeRequestSchema = z.object({
  action: z.literal('invoke'),
  stream: z.literal(true),
  sessionId: z.string().min(1),
  inputs: z.object({
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
})

export type ChartDataPoint = z.infer<typeof chartDataPointSchema>
export type StructuredBlock = z.infer<typeof structuredBlockSchema>
export type StreamEvent = z.infer<typeof streamEventSchema>
export type InvokeRequest = z.infer<typeof invokeRequestSchema>
export type InvokeResponse = StreamEvent
