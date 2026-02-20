import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StructuredBlock } from '../../agent/types'
import { ChartBlock } from './ChartBlock'

const rechartsMocks = vi.hoisted(() => {
  const makeMockChartPart = (testId: string) =>
    vi.fn(
      ({ children }: { children?: ReactNode }): JSX.Element => (
        <div data-testid={testId}>{children}</div>
      ),
    )

  return {
    Area: makeMockChartPart('Area'),
    AreaChart: makeMockChartPart('AreaChart'),
    Bar: makeMockChartPart('Bar'),
    BarChart: makeMockChartPart('BarChart'),
    CartesianGrid: makeMockChartPart('CartesianGrid'),
    Cell: makeMockChartPart('Cell'),
    Legend: makeMockChartPart('Legend'),
    Line: makeMockChartPart('Line'),
    LineChart: makeMockChartPart('LineChart'),
    Pie: makeMockChartPart('Pie'),
    PieChart: makeMockChartPart('PieChart'),
    ResponsiveContainer: makeMockChartPart('ResponsiveContainer'),
    Tooltip: makeMockChartPart('Tooltip'),
    XAxis: makeMockChartPart('XAxis'),
    YAxis: makeMockChartPart('YAxis'),
  }
})

vi.mock('recharts', () => rechartsMocks)

type ChartBlockData = Extract<StructuredBlock, { kind: 'chart' }>
type MultiSeriesChartType = 'stacked-bar' | 'grouped-bar' | 'multi-line' | 'stacked-area'
type SingleSeriesChartType = 'bar' | 'line' | 'pie' | 'area'

afterEach((): void => {
  document.documentElement.style.removeProperty('--chart-series-1')
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

function buildSingleSeriesChartBlock(
  chartType: SingleSeriesChartType,
  colors?: string[],
): ChartBlockData {
  return {
    chartType,
    colors,
    data: [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
      { label: 'C', value: 30 },
    ],
    kind: 'chart',
    title: `${chartType} chart`,
  }
}

function buildMultiSeriesChartBlock(
  chartType: MultiSeriesChartType,
  config?: {
    colors?: string[]
    data?: Array<{ label: string } & Record<string, string | number>>
    series?: string[]
  },
): ChartBlockData {
  const series = config?.series || ['Revenue', 'Cost']

  return {
    chartType,
    colors: config?.colors,
    data: config?.data || [
      { label: 'Q1', Revenue: 100, Cost: 60 },
      { label: 'Q2', Revenue: 120, Cost: 65 },
    ],
    kind: 'chart',
    series,
    title: `${chartType} chart`,
  }
}

function buildChartBlock(chartType: ChartBlockData['chartType']): ChartBlockData {
  if (chartType === 'stacked-bar') {
    return buildMultiSeriesChartBlock(chartType)
  }

  if (chartType === 'grouped-bar') {
    return buildMultiSeriesChartBlock(chartType)
  }

  if (chartType === 'multi-line') {
    return buildMultiSeriesChartBlock(chartType)
  }

  if (chartType === 'stacked-area') {
    return buildMultiSeriesChartBlock(chartType)
  }

  return buildSingleSeriesChartBlock(chartType)
}

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject): void => {
    const reader = new FileReader()

    reader.addEventListener('load', (): void => {
      resolve(String(reader.result || ''))
    })
    reader.addEventListener('error', (): void => {
      reject(reader.error)
    })
    reader.readAsText(blob)
  })
}

describe('ChartBlock', (): void => {
  it.each([
    ['bar', 'BarChart'],
    ['line', 'LineChart'],
    ['pie', 'PieChart'],
    ['area', 'AreaChart'],
    ['stacked-bar', 'BarChart'],
    ['grouped-bar', 'BarChart'],
    ['multi-line', 'LineChart'],
    ['stacked-area', 'AreaChart'],
  ] as const)(
    'renders %s chart data using the correct Recharts container',
    (chartType, chartContainerTestId): void => {
      render(<ChartBlock block={buildChartBlock(chartType)} />)

      expect(screen.getByText(`${chartType} chart`)).toBeInTheDocument()
      expect(screen.getByTestId(`chart-block-${chartType}`)).toBeInTheDocument()
      expect(screen.getByTestId(chartContainerTestId)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Download block data' })).toBeInTheDocument()
    },
  )

  it('renders stacked bar series using stackId', (): void => {
    render(<ChartBlock block={buildMultiSeriesChartBlock('stacked-bar')} />)

    const barCalls = rechartsMocks.Bar.mock.calls as [Record<string, unknown>][]

    expect(barCalls).toHaveLength(2)
    expect(
      barCalls.map(([props]) => ({
        dataKey: props.dataKey,
        fill: props.fill,
        stackId: props.stackId,
      })),
    ).toEqual([
      {
        dataKey: 'Revenue',
        fill: '#f59e0b',
        stackId: 'a',
      },
      {
        dataKey: 'Cost',
        fill: '#10b981',
        stackId: 'a',
      },
    ])
  })

  it('renders grouped bar series without stackId', (): void => {
    render(<ChartBlock block={buildMultiSeriesChartBlock('grouped-bar')} />)

    const barCalls = rechartsMocks.Bar.mock.calls as [Record<string, unknown>][]
    expect(barCalls).toHaveLength(2)
    expect(
      barCalls.map(([props]) => ({
        dataKey: props.dataKey,
        fill: props.fill,
        stackId: props.stackId,
      })),
    ).toEqual([
      {
        dataKey: 'Revenue',
        fill: '#f59e0b',
        stackId: undefined,
      },
      {
        dataKey: 'Cost',
        fill: '#10b981',
        stackId: undefined,
      },
    ])
  })

  it('renders multi-line series and cycles default colors', (): void => {
    render(
      <ChartBlock
        block={buildMultiSeriesChartBlock('multi-line', {
          data: [
            { label: 'Q1', Budget: 100, Spend: 90, Savings: 10, Risk: 8, Margin: 30, Forecast: 34 },
            { label: 'Q2', Budget: 110, Spend: 98, Savings: 12, Risk: 7, Margin: 32, Forecast: 36 },
          ],
          series: ['Budget', 'Spend', 'Savings', 'Risk', 'Margin', 'Forecast'],
        })}
      />,
    )

    const lineCalls = rechartsMocks.Line.mock.calls as [Record<string, unknown>][]
    expect(lineCalls).toHaveLength(6)
    expect(lineCalls.map(([props]) => props.stroke)).toEqual([
      '#f59e0b',
      '#10b981',
      '#3b82f6',
      '#8b5cf6',
      '#ef4444',
      '#f59e0b',
    ])
  })

  it('renders stacked-area series using stackId', (): void => {
    render(<ChartBlock block={buildMultiSeriesChartBlock('stacked-area')} />)

    const areaCalls = rechartsMocks.Area.mock.calls as [Record<string, unknown>][]
    expect(areaCalls).toHaveLength(2)
    expect(
      areaCalls.map(([props]) => ({
        dataKey: props.dataKey,
        fill: props.fill,
        stackId: props.stackId,
      })),
    ).toEqual([
      {
        dataKey: 'Revenue',
        fill: '#f59e0b',
        stackId: 'a',
      },
      {
        dataKey: 'Cost',
        fill: '#10b981',
        stackId: 'a',
      },
    ])
  })

  it('uses high-contrast tooltip content style for cartesian charts', (): void => {
    render(<ChartBlock block={buildSingleSeriesChartBlock('bar')} />)

    const tooltipCalls = rechartsMocks.Tooltip.mock.calls as [Record<string, unknown>][]
    expect(tooltipCalls).toHaveLength(1)
    expect(tooltipCalls[0][0].contentStyle).toMatchObject({
      backgroundColor: '#0e1219',
      border: '1px solid #475569',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      color: '#f1f5f9',
    })
  })

  it('uses high-contrast tooltip content style for pie charts', (): void => {
    render(<ChartBlock block={buildSingleSeriesChartBlock('pie')} />)

    const tooltipCalls = rechartsMocks.Tooltip.mock.calls as [Record<string, unknown>][]
    expect(tooltipCalls).toHaveLength(1)
    expect(tooltipCalls[0][0].contentStyle).toMatchObject({
      backgroundColor: '#0e1219',
      border: '1px solid #475569',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      color: '#f1f5f9',
    })
  })

  it('uses brighter tooltip label style', (): void => {
    render(<ChartBlock block={buildSingleSeriesChartBlock('line')} />)

    const tooltipCalls = rechartsMocks.Tooltip.mock.calls as [Record<string, unknown>][]
    expect(tooltipCalls).toHaveLength(1)
    expect(tooltipCalls[0][0].labelStyle).toMatchObject({
      color: '#cbd5e1',
      fontWeight: 600,
    })
  })

  it('uses custom color overrides for pie chart cells', (): void => {
    render(<ChartBlock block={buildSingleSeriesChartBlock('pie', ['#111111', '#222222'])} />)

    const cellCalls = rechartsMocks.Cell.mock.calls as [Record<string, unknown>][]
    expect(cellCalls.map(([props]) => props.fill)).toEqual(['#111111', '#222222', '#111111'])
  })

  it('uses custom color overrides for multi-series charts', (): void => {
    render(
      <ChartBlock
        block={buildMultiSeriesChartBlock('multi-line', {
          colors: ['#ff0000', '#00ff00'],
        })}
      />,
    )

    const lineCalls = rechartsMocks.Line.mock.calls as [Record<string, unknown>][]
    expect(lineCalls).toHaveLength(2)
    expect(lineCalls.map(([props]) => props.stroke)).toEqual(['#ff0000', '#00ff00'])
  })

  it('falls back to CSS token colors when color overrides are not provided', (): void => {
    render(<ChartBlock block={buildSingleSeriesChartBlock('bar')} />)

    const barCalls = rechartsMocks.Bar.mock.calls as [Record<string, unknown>][]
    expect(barCalls).toHaveLength(1)
    expect(barCalls[0][0].fill).toBe('#f59e0b')
  })

  it('resolves CSS variable colors before passing them to Recharts', (): void => {
    document.documentElement.style.setProperty('--chart-series-1', '#22d3ee')
    render(<ChartBlock block={buildSingleSeriesChartBlock('bar', ['var(--chart-series-1)'])} />)

    const barCalls = rechartsMocks.Bar.mock.calls as [Record<string, unknown>][]
    expect(barCalls).toHaveLength(1)
    expect(barCalls[0][0].fill).toBe('#22d3ee')
  })

  it('uses responsive container sizing without inline wrapper height overrides', (): void => {
    render(<ChartBlock block={buildSingleSeriesChartBlock('bar')} />)

    const chartContainer = screen.getByTestId('chart-container')
    expect(chartContainer.getAttribute('style')).toBeNull()

    const responsiveContainerCalls = rechartsMocks.ResponsiveContainer.mock.calls as [
      Record<string, unknown>,
    ][]
    expect(responsiveContainerCalls[0][0].height).toBe('100%')
  })

  it('downloads chart payload as json', async (): Promise<void> => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:chart')
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation((): void => {})
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation((): void => {})

    const block = buildSingleSeriesChartBlock('bar')

    render(<ChartBlock block={block} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download block data' }))

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    expect(anchorClickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:chart')

    const blob = createObjectUrlSpy.mock.calls[0][0] as Blob
    const json = await readBlobAsText(blob)

    expect(JSON.parse(json)).toEqual(block)
  })
})
