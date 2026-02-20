import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { StructuredBlock } from '../../agent/types.js'
import { BlockDownloadButton } from './BlockDownloadButton.js'
import './StructuredBlocks.css'

export type ChartBlockData = Extract<StructuredBlock, { kind: 'chart' }>

interface StandardChartBlockProps {
  block: ChartBlockData
  expandedHeight?: number
}

const defaultChartSeriesColors = [
  'var(--chart-series-1)',
  'var(--chart-series-2)',
  'var(--chart-series-3)',
  'var(--chart-series-4)',
]

const multiSeriesChartTypes = new Set(['stacked-bar', 'grouped-bar', 'multi-line', 'stacked-area'])

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'rgba(14, 18, 25, 0.96)',
  border: '1px solid var(--border-strong, #2a3040)',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '0.8rem',
}

const tooltipLabelStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontWeight: 600,
  marginBottom: '2px',
}

function truncateLabel(label: string, maxLen = 16): string {
  if (label.length <= maxLen) return label
  return label.slice(0, maxLen - 1) + '…'
}

function chartColor(block: ChartBlockData, index: number): string {
  const configuredColors = block.colors || []
  const palette = configuredColors.length > 0 ? configuredColors : defaultChartSeriesColors

  return palette[index % palette.length]
}

function isMultiSeriesChart(
  chartType: ChartBlockData['chartType'],
): chartType is 'stacked-bar' | 'grouped-bar' | 'multi-line' | 'stacked-area' {
  return multiSeriesChartTypes.has(chartType)
}

type MultiSeriesDataPoint = Record<string, string | number>

function resolveSeries(block: ChartBlockData): string[] {
  if (block.series && block.series.length > 0) {
    return block.series
  }

  const firstDataPoint = (block.data as MultiSeriesDataPoint[])[0]
  if (!firstDataPoint) {
    return []
  }

  return Object.keys(firstDataPoint).filter((key) => key !== 'label')
}

function renderChart(block: ChartBlockData): JSX.Element {
  if (block.chartType === 'bar') {
    return (
      <BarChart data={block.data} margin={{ top: 8, right: 16, bottom: 56, left: 8 }}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis
          angle={-40}
          dataKey="label"
          height={64}
          interval={0}
          stroke="var(--text-muted)"
          textAnchor="end"
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          tickFormatter={(v: string): string => truncateLabel(v, 20)}
        />
        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={40} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Bar dataKey="value" fill={chartColor(block, 0)} name={block.title} radius={[6, 6, 0, 0]} />
      </BarChart>
    )
  }

  if (block.chartType === 'line') {
    return (
      <LineChart data={block.data}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="var(--text-muted)" />
        <YAxis stroke="var(--text-muted)" />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend />
        <Line
          dataKey="value"
          dot={{ stroke: chartColor(block, 0), strokeWidth: 2 }}
          name={block.title}
          stroke={chartColor(block, 0)}
          strokeWidth={3}
          type="monotone"
        />
      </LineChart>
    )
  }

  if (block.chartType === 'area') {
    return (
      <AreaChart data={block.data}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="var(--text-muted)" />
        <YAxis stroke="var(--text-muted)" />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend />
        <Area
          dataKey="value"
          fill={chartColor(block, 1)}
          fillOpacity={0.25}
          name={block.title}
          stroke={chartColor(block, 1)}
          strokeWidth={3}
          type="monotone"
        />
      </AreaChart>
    )
  }

  if (isMultiSeriesChart(block.chartType)) {
    const series = resolveSeries(block)
    const data = block.data as MultiSeriesDataPoint[]

    if (block.chartType === 'stacked-bar') {
      return (
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 56, left: 8 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis angle={-40} dataKey="label" height={64} interval={0} stroke="var(--text-muted)" textAnchor="end" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v: string): string => truncateLabel(v, 20)} />
          <YAxis stroke="var(--text-muted)" width={40} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
          <Legend />
          {series.map((seriesName, index) => (
            <Bar
              dataKey={seriesName}
              fill={chartColor(block, index)}
              key={seriesName}
              name={seriesName}
              stackId="a"
            />
          ))}
        </BarChart>
      )
    }

    if (block.chartType === 'grouped-bar') {
      return (
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 56, left: 8 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis angle={-40} dataKey="label" height={64} interval={0} stroke="var(--text-muted)" textAnchor="end" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v: string): string => truncateLabel(v, 20)} />
          <YAxis stroke="var(--text-muted)" width={40} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
          <Legend />
          {series.map((seriesName, index) => (
            <Bar
              dataKey={seriesName}
              fill={chartColor(block, index)}
              key={seriesName}
              name={seriesName}
            />
          ))}
        </BarChart>
      )
    }

    if (block.chartType === 'multi-line') {
      return (
        <LineChart data={data}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--text-muted)" />
          <YAxis stroke="var(--text-muted)" />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
          <Legend />
          {series.map((seriesName, index) => (
            <Line
              dataKey={seriesName}
              dot={{ stroke: chartColor(block, index), strokeWidth: 2 }}
              key={seriesName}
              name={seriesName}
              stroke={chartColor(block, index)}
              strokeWidth={3}
              type="monotone"
            />
          ))}
        </LineChart>
      )
    }

    return (
      <AreaChart data={data}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="var(--text-muted)" />
        <YAxis stroke="var(--text-muted)" />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend />
        {series.map((seriesName, index) => (
          <Area
            dataKey={seriesName}
            fill={chartColor(block, index)}
            fillOpacity={0.2}
            key={seriesName}
            name={seriesName}
            stackId="a"
            stroke={chartColor(block, index)}
            strokeWidth={2}
            type="monotone"
          />
        ))}
      </AreaChart>
    )
  }

  return (
    <PieChart>
      <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
      <Legend />
      <Pie cx="50%" cy="50%" data={block.data} dataKey="value" nameKey="label" outerRadius={84}>
        {block.data.map((point, index) => (
          <Cell fill={chartColor(block, index)} key={`${point.label}-${index.toString()}`} />
        ))}
      </Pie>
    </PieChart>
  )
}

/**
 * Existing Recharts implementation for chart blocks.
 */
export function StandardChartBlock({ block, expandedHeight }: StandardChartBlockProps): JSX.Element {
  return (
    <section className="cei-block" data-testid={`chart-block-${block.chartType}`}>
      <header className="cei-block-header">
        <h4 className="cei-block-title">{block.title}</h4>
        <BlockDownloadButton filenameBase={`${block.title}-chart`} payload={block} />
      </header>

      <div className="cei-chart-wrapper" data-testid="chart-container">
        <ResponsiveContainer height={expandedHeight || '100%'} width="100%">
          {renderChart(block)}
        </ResponsiveContainer>
      </div>
    </section>
  )
}
