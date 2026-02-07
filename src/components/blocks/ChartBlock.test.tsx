import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StructuredBlock } from '../../agent/types'
import { ChartBlock } from './ChartBlock'

interface MockChartPartProps {
  children?: ReactNode
}

function makeMockChartPart(testId: string) {
  return ({ children }: MockChartPartProps): JSX.Element => (
    <div data-testid={testId}>{children}</div>
  )
}

vi.mock('recharts', () => ({
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
}))

afterEach((): void => {
  vi.restoreAllMocks()
})

function buildChartBlock(
  chartType: 'bar' | 'line' | 'pie' | 'area',
): Extract<StructuredBlock, { kind: 'chart' }> {
  return {
    chartType,
    data: [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
    ],
    kind: 'chart',
    title: `${chartType} chart`,
  }
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

  it('downloads chart payload as json', async (): Promise<void> => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:chart')
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation((): void => {})
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation((): void => {})

    const block = buildChartBlock('bar')

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
