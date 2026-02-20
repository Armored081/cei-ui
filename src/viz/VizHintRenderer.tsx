import { z } from 'zod'

import type { VizHint } from '../types/modern-context.js'
import { GaugeChart } from './GaugeChart.js'
import { HeatmapChart } from './HeatmapChart.js'
import { TimelineChart } from './TimelineChart.js'
import type { VizSeverity } from './viz-theme.js'
import './viz.css'

const severitySchema = z.enum(['critical', 'high', 'medium', 'low'])

const gaugeHintDataSchema = z.object({
  value: z.number(),
  max: z.number().positive().optional(),
  label: z.string().optional(),
  severity: severitySchema.optional(),
})

const gaugeHintConfigSchema = z.object({
  max: z.number().positive().optional(),
  label: z.string().optional(),
  severity: severitySchema.optional(),
})

const timelineEventSchema = z.object({
  timestamp: z.string(),
  label: z.string(),
  severity: z.string().optional(),
})

const timelineDataSchema = z.array(timelineEventSchema)

const heatmapDatumSchema = z.object({
  x: z.string(),
  y: z.string(),
  value: z.number(),
})

const heatmapDataSchema = z.array(heatmapDatumSchema)
const heatmapConfigSchema = z.object({
  maxValue: z.number().positive().optional(),
})

const barDatumSchema = z.object({
  label: z.string(),
  value: z.number(),
})

const barDataSchema = z.union([barDatumSchema, z.array(barDatumSchema).min(1)])

const barConfigSchema = z.object({
  max: z.number().positive().optional(),
})

interface VizHintRendererProps {
  hint: VizHint
  width?: number
  height?: number
}

function warnInvalidHint(hint: VizHint, reason: string): void {
  console.warn(`[VizHintRenderer] Unable to render viz hint "${hint.id}": ${reason}`)
}

function normalizeSeverity(value: unknown): VizSeverity | undefined {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
    return value
  }

  return undefined
}

/**
 * Routes viz-hint metadata to specialized visualization components.
 */
export function VizHintRenderer({ hint, width, height }: VizHintRendererProps): JSX.Element | null {
  if (hint.chartType === 'gauge') {
    const parsedData = gaugeHintDataSchema.safeParse(hint.data)

    if (!parsedData.success) {
      warnInvalidHint(hint, 'gauge data payload is malformed')
      return null
    }

    const parsedConfig = gaugeHintConfigSchema.safeParse(hint.config || {})

    if (!parsedConfig.success) {
      warnInvalidHint(hint, 'gauge config payload is malformed')
      return null
    }

    const resolvedMax = parsedData.data.max || parsedConfig.data.max || 100
    const resolvedLabel = parsedData.data.label || parsedConfig.data.label || hint.title || 'Gauge'
    const resolvedSeverity =
      normalizeSeverity(parsedData.data.severity) || normalizeSeverity(parsedConfig.data.severity)

    return (
      <div className="cei-viz-hint" data-testid="viz-hint-gauge">
        {hint.title ? <h4 className="cei-viz-hint-title">{hint.title}</h4> : null}
        <GaugeChart
          height={height}
          label={resolvedLabel}
          max={resolvedMax}
          severity={resolvedSeverity}
          value={parsedData.data.value}
          width={width}
        />
      </div>
    )
  }

  if (hint.chartType === 'timeline') {
    const parsedData = timelineDataSchema.safeParse(hint.data)

    if (!parsedData.success) {
      warnInvalidHint(hint, 'timeline data payload is malformed')
      return null
    }

    return (
      <div className="cei-viz-hint" data-testid="viz-hint-timeline">
        {hint.title ? <h4 className="cei-viz-hint-title">{hint.title}</h4> : null}
        <TimelineChart events={parsedData.data} height={height} width={width} />
      </div>
    )
  }

  if (hint.chartType === 'heatmap') {
    const parsedData = heatmapDataSchema.safeParse(hint.data)

    if (!parsedData.success) {
      warnInvalidHint(hint, 'heatmap data payload is malformed')
      return null
    }

    const parsedConfig = heatmapConfigSchema.safeParse(hint.config || {})

    if (!parsedConfig.success) {
      warnInvalidHint(hint, 'heatmap config payload is malformed')
      return null
    }

    const computedMax = parsedData.data.reduce(
      (maxValue, item) => Math.max(maxValue, item.value),
      0,
    )
    const maxValue = parsedConfig.data.maxValue || computedMax || 1

    return (
      <div className="cei-viz-hint" data-testid="viz-hint-heatmap">
        {hint.title ? <h4 className="cei-viz-hint-title">{hint.title}</h4> : null}
        <HeatmapChart data={parsedData.data} height={height} maxValue={maxValue} width={width} />
      </div>
    )
  }

  if (hint.chartType === 'bar') {
    const parsedData = barDataSchema.safeParse(hint.data)

    if (!parsedData.success) {
      warnInvalidHint(hint, 'bar data payload is malformed')
      return null
    }

    const parsedConfig = barConfigSchema.safeParse(hint.config || {})

    if (!parsedConfig.success) {
      warnInvalidHint(hint, 'bar config payload is malformed')
      return null
    }

    const data = Array.isArray(parsedData.data) ? parsedData.data : [parsedData.data]
    const maxValue =
      parsedConfig.data.max ||
      data.reduce((maxEntryValue, entry) => Math.max(maxEntryValue, entry.value), 0) ||
      1

    return (
      <div className="cei-viz-hint" data-testid="viz-hint-bar">
        {hint.title ? <h4 className="cei-viz-hint-title">{hint.title}</h4> : null}
        <div className="cei-viz-frame cei-viz-bar-frame">
          <ul className="cei-viz-bar-list" role="img" aria-label={`${hint.title || 'Bar'} chart`}>
            {data.map((entry) => {
              const ratio = Math.max(0, Math.min(1, entry.value / maxValue))

              return (
                <li className="cei-viz-bar-item" key={`${entry.label}-${entry.value.toString()}`}>
                  <span className="cei-viz-bar-label">{entry.label}</span>
                  <span className="cei-viz-bar-track">
                    <span
                      className="cei-viz-bar-fill"
                      style={{ width: `${(ratio * 100).toFixed(2)}%` }}
                    />
                  </span>
                  <span className="cei-viz-bar-value">{entry.value.toString()}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    )
  }

  console.warn(
    `[VizHintRenderer] Unknown chart type "${String(hint.chartType)}" for hint "${hint.id}"`,
  )
  return null
}
