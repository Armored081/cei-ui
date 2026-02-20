import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { VizHint } from '../../types/modern-context.js'
import { VizHintRenderer } from '../VizHintRenderer.js'

function buildGaugeHint(): VizHint {
  return {
    id: 'hint-gauge',
    chartType: 'gauge',
    title: 'Risk Score',
    data: {
      value: 62,
      max: 100,
      label: 'Risk',
      severity: 'high',
    },
  }
}

function buildTimelineHint(): VizHint {
  return {
    id: 'hint-timeline',
    chartType: 'timeline',
    title: 'Incident timeline',
    data: [
      { timestamp: '2026-02-01T00:00:00.000Z', label: 'Scan started' },
      { timestamp: '2026-02-02T00:00:00.000Z', label: 'Alert triggered', severity: 'critical' },
    ],
  }
}

function buildHeatmapHint(): VizHint {
  return {
    id: 'hint-heatmap',
    chartType: 'heatmap',
    title: 'Risk distribution',
    data: [
      { x: 'Mon', y: 'Critical', value: 8 },
      { x: 'Tue', y: 'Critical', value: 4 },
      { x: 'Mon', y: 'High', value: 5 },
    ],
    config: {
      maxValue: 10,
    },
  }
}

describe('VizHintRenderer', (): void => {
  it('routes gauge hints to GaugeChart', (): void => {
    render(<VizHintRenderer hint={buildGaugeHint()} />)

    expect(screen.getByTestId('viz-hint-gauge')).toBeInTheDocument()
    expect(screen.getByTestId('gauge-chart')).toBeInTheDocument()
  })

  it('routes timeline hints to TimelineChart', (): void => {
    render(<VizHintRenderer hint={buildTimelineHint()} />)

    expect(screen.getByTestId('viz-hint-timeline')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-chart')).toBeInTheDocument()
  })

  it('routes heatmap hints to HeatmapChart', (): void => {
    render(<VizHintRenderer hint={buildHeatmapHint()} />)

    expect(screen.getByTestId('viz-hint-heatmap')).toBeInTheDocument()
    expect(screen.getByTestId('heatmap-chart')).toBeInTheDocument()
  })

  it('passes width and height props to chart renderers', (): void => {
    render(<VizHintRenderer height={180} hint={buildGaugeHint()} width={320} />)

    const svg = screen.getByRole('img', { name: 'Risk gauge' })
    expect(svg).toHaveAttribute('width', '320')
    expect(svg).toHaveAttribute('height', '180')
  })

  it('returns null and warns when chart type is unknown', (): void => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((): void => {})

    const hint = {
      id: 'hint-unknown',
      chartType: 'unknown',
      title: 'Unknown',
      data: {},
    } as unknown as VizHint

    const { container } = render(<VizHintRenderer hint={hint} />)

    expect(container).toBeEmptyDOMElement()
    expect(warnSpy).toHaveBeenCalled()
  })

  it('returns null and warns when data is malformed', (): void => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((): void => {})

    const malformedHint: VizHint = {
      id: 'hint-malformed',
      chartType: 'timeline',
      title: 'Malformed timeline',
      data: { not: 'an-array' },
    }

    const { container } = render(<VizHintRenderer hint={malformedHint} />)

    expect(container).toBeEmptyDOMElement()
    expect(warnSpy).toHaveBeenCalled()
  })
})
