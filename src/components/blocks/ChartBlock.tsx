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

import type { StructuredBlock } from '../../agent/types'
import { BlockDownloadButton } from './BlockDownloadButton'
import './StructuredBlocks.css'

type ChartBlockData = Extract<StructuredBlock, { kind: 'chart' }>

interface ChartBlockProps {
  block: ChartBlockData
}

const defaultChartSeriesColors = [
  'var(--chart-series-1)',
  'var(--chart-series-2)',
  'var(--chart-series-3)',
  'var(--chart-series-4)',
]

const multiSeriesChartTypes = new Set(['stacked-bar', 'grouped-bar', 'multi-line', 'stacked-area'])

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
      <BarChart data={block.data}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="var(--text-muted)" />
        <YAxis stroke="var(--text-muted)" />
        <Tooltip />
        <Legend />
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
        <Tooltip />
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
        <Tooltip />
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
        <BarChart data={data}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--text-muted)" />
          <YAxis stroke="var(--text-muted)" />
          <Tooltip />
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
        <BarChart data={data}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="var(--text-muted)" />
          <YAxis stroke="var(--text-muted)" />
          <Tooltip />
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
          <Tooltip />
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
        <Tooltip />
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
      <Tooltip />
      <Legend />
      <Pie cx="50%" cy="50%" data={block.data} dataKey="value" nameKey="label" outerRadius={84}>
        {block.data.map((point, index) => (
          <Cell fill={chartColor(block, index)} key={`${point.label}-${index.toString()}`} />
        ))}
      </Pie>
    </PieChart>
  )
}

export function ChartBlock({ block }: ChartBlockProps): JSX.Element {
  return (
    <section className="cei-block" data-testid={`chart-block-${block.chartType}`}>
      <header className="cei-block-header">
        <h4 className="cei-block-title">{block.title}</h4>
        <BlockDownloadButton filenameBase={`${block.title}-chart`} payload={block} />
      </header>

      <div className="cei-chart-wrapper" data-testid="chart-container">
        <ResponsiveContainer height={240} width="100%">
          {renderChart(block)}
        </ResponsiveContainer>
      </div>
    </section>
  )
}
