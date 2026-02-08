import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StructuredBlock } from '../../agent/types'
import { ChartBlock } from './ChartBlock'

const rechartsMocks = vi.hoisted(() => {
  const makeMockChartPart = (testId: string) =>
    vi.fn(
      ({ children }: { children?: unknown }): JSX.Element => (
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
    data?: Array<Record<string, string | number>>
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

    const barCalls = rechartsMocks.Bar.mock.calls as [
      Record<string, unknown>,
      Record<string, unknown>,
    ][]

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
        fill: 'var(--chart-series-1)',
        stackId: 'a',
      },
      {
        dataKey: 'Cost',
        fill: 'var(--chart-series-2)',
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
        fill: 'var(--chart-series-1)',
        stackId: undefined,
      },
      {
        dataKey: 'Cost',
        fill: 'var(--chart-series-2)',
        stackId: undefined,
      },
    ])
  })

  it('renders multi-line series and cycles default colors', (): void => {
    render(
      <ChartBlock
        block={buildMultiSeriesChartBlock('multi-line', {
          data: [
            { label: 'Q1', Budget: 100, Spend: 90, Savings: 10, Risk: 8, Margin: 30 },
            { label: 'Q2', Budget: 110, Spend: 98, Savings: 12, Risk: 7, Margin: 32 },
          ],
          series: ['Budget', 'Spend', 'Savings', 'Risk', 'Margin'],
        })}
      />,
    )

    const lineCalls = rechartsMocks.Line.mock.calls as [Record<string, unknown>][]
    expect(lineCalls).toHaveLength(5)
    expect(lineCalls.map(([props]) => props.stroke)).toEqual([
      'var(--chart-series-1)',
      'var(--chart-series-2)',
      'var(--chart-series-3)',
      'var(--chart-series-4)',
      'var(--chart-series-1)',
    ])
  })

  it('renders stacked-area series using stackId', (): void => {
    render(<ChartBlock block={buildMultiSeriesChartBlock('stacked-area')} />)

    const areaCalls = rechartsMocks.Area.mock.calls as [
      Record<string, unknown>,
      Record<string, unknown>,
    ][]
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
        fill: 'var(--chart-series-1)',
        stackId: 'a',
      },
      {
        dataKey: 'Cost',
        fill: 'var(--chart-series-2)',
        stackId: 'a',
      },
    ])
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
    expect(barCalls[0][0].fill).toBe('var(--chart-series-1)')
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
