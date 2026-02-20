import { interpolateRgb } from 'd3'
import { useMemo, useRef, useState } from 'react'

import { VIZ_THEME } from './viz-theme.js'
import './viz.css'

/**
 * Heatmap datum.
 */
export interface HeatmapDatum {
  x: string
  y: string
  value: number
}

/**
 * Heatmap chart props.
 */
export interface HeatmapChartProps {
  data: HeatmapDatum[]
  maxValue: number
  width?: number
  height?: number
}

interface TooltipState {
  datum: HeatmapDatum
  x: number
  y: number
}

function stableUnique(values: string[]): string[] {
  const seen = new Set<string>()
  const uniqueValues: string[] = []

  values.forEach((value) => {
    if (!seen.has(value)) {
      seen.add(value)
      uniqueValues.push(value)
    }
  })

  return uniqueValues
}

function heatCellColor(value: number, maxValue: number): string {
  const ratio = maxValue <= 0 ? 0 : Math.max(0, Math.min(1, value / maxValue))
  return interpolateRgb('#1a2233', '#e5a530')(ratio)
}

/**
 * SVG grid heatmap with axis labels and hover tooltips.
 */
export function HeatmapChart({
  data,
  maxValue,
  width = 720,
  height = 280,
}: HeatmapChartProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const xValues = useMemo((): string[] => stableUnique(data.map((item) => item.x)), [data])
  const yValues = useMemo((): string[] => stableUnique(data.map((item) => item.y)), [data])

  const gridLookup = useMemo((): Map<string, HeatmapDatum> => {
    const map = new Map<string, HeatmapDatum>()
    data.forEach((item) => {
      map.set(`${item.x}||${item.y}`, item)
    })
    return map
  }, [data])

  if (data.length === 0 || xValues.length === 0 || yValues.length === 0) {
    return (
      <div className="cei-viz-frame" data-testid="heatmap-chart">
        <p className="cei-viz-empty">No heatmap data available.</p>
      </div>
    )
  }

  const padding = {
    top: 20,
    right: 20,
    bottom: 36,
    left: 90,
  }

  const cellWidth = (width - padding.left - padding.right) / xValues.length
  const cellHeight = (height - padding.top - padding.bottom) / yValues.length

  const onCellHover = (event: MouseEvent, datum: HeatmapDatum): void => {
    const bounds = containerRef.current?.getBoundingClientRect()

    if (!bounds) {
      return
    }

    setTooltip({
      datum,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
  }

  return (
    <div className="cei-viz-frame" data-testid="heatmap-chart" ref={containerRef}>
      <svg height={height} viewBox={`0 0 ${width.toString()} ${height.toString()}`} width={width}>
        {yValues.map((yValue, rowIndex) => (
          <text
            className="cei-viz-axis-label"
            key={`row-axis-${yValue}`}
            textAnchor="end"
            x={padding.left - 8}
            y={padding.top + rowIndex * cellHeight + cellHeight / 2 + 4}
          >
            {yValue}
          </text>
        ))}

        {xValues.map((xValue, columnIndex) => (
          <text
            className="cei-viz-axis-label"
            key={`column-axis-${xValue}`}
            textAnchor="middle"
            x={padding.left + columnIndex * cellWidth + cellWidth / 2}
            y={height - 10}
          >
            {xValue}
          </text>
        ))}

        {yValues.flatMap((yValue, rowIndex) =>
          xValues.map((xValue, columnIndex) => {
            const key = `${xValue}||${yValue}`
            const datum = gridLookup.get(key) || {
              x: xValue,
              y: yValue,
              value: 0,
            }
            const x = padding.left + columnIndex * cellWidth
            const y = padding.top + rowIndex * cellHeight
            const fillColor = heatCellColor(datum.value, maxValue)

            return (
              <g key={key}>
                <rect
                  className="cei-viz-heatmap-cell"
                  data-testid="heatmap-cell"
                  fill={fillColor}
                  height={Math.max(cellHeight - 2, 2)}
                  onMouseEnter={(event): void => onCellHover(event.nativeEvent, datum)}
                  onMouseLeave={(): void => setTooltip(null)}
                  onMouseMove={(event): void => onCellHover(event.nativeEvent, datum)}
                  rx={3}
                  ry={3}
                  stroke={VIZ_THEME.grid}
                  width={Math.max(cellWidth - 2, 2)}
                  x={x}
                  y={y}
                />
                <text
                  className="cei-viz-value-label"
                  textAnchor="middle"
                  x={x + cellWidth / 2}
                  y={y + cellHeight / 2 + 4}
                >
                  {Math.round(datum.value).toString()}
                </text>
              </g>
            )
          }),
        )}
      </svg>

      {tooltip ? (
        <div
          className="cei-viz-tooltip"
          role="status"
          style={{
            left: `${Math.max(8, tooltip.x + 10).toString()}px`,
            top: `${Math.max(8, tooltip.y - 20).toString()}px`,
          }}
        >
          <div>{`${tooltip.datum.y} · ${tooltip.datum.x}`}</div>
          <div>{`Value: ${tooltip.datum.value.toString()}`}</div>
        </div>
      ) : null}
    </div>
  )
}
