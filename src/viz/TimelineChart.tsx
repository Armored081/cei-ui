import { extent, scaleTime, select, zoom, zoomIdentity, type ZoomTransform } from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'

import { severityColor, VIZ_THEME } from './viz-theme.js'
import './viz.css'

/**
 * Timeline chart event input.
 */
export interface TimelineEvent {
  timestamp: string
  label: string
  severity?: string
}

/**
 * Timeline chart props.
 */
export interface TimelineChartProps {
  events: TimelineEvent[]
  width?: number
  height?: number
}

interface ParsedTimelineEvent {
  id: string
  label: string
  severity?: string
  date: Date
}

interface TooltipState {
  event: ParsedTimelineEvent
  x: number
  y: number
}

/**
 * Horizontal temporal timeline with zoom/pan and hover tooltips.
 */
export function TimelineChart({
  events,
  width = 720,
  height = 260,
}: TimelineChartProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoomTransform, setZoomTransform] = useState<ZoomTransform>(zoomIdentity)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const padding = {
    top: 20,
    right: 24,
    bottom: 60,
    left: 24,
  }

  const parsedEvents = useMemo((): ParsedTimelineEvent[] => {
    return events
      .map((event, index): ParsedTimelineEvent | null => {
        const parsedTime = Date.parse(event.timestamp)

        if (!Number.isFinite(parsedTime)) {
          return null
        }

        return {
          id: `${event.label}-${index.toString()}`,
          label: event.label,
          severity: event.severity,
          date: new Date(parsedTime),
        }
      })
      .filter((event): event is ParsedTimelineEvent => Boolean(event))
      .sort((left, right) => left.date.getTime() - right.date.getTime())
  }, [events])

  useEffect((): void => {
    setZoomTransform(zoomIdentity)
  }, [parsedEvents])

  useEffect((): (() => void) => {
    const svgElement = svgRef.current

    if (!svgElement) {
      return (): void => {}
    }

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .extent([
        [0, 0],
        [width, height],
      ])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .on('zoom', (event): void => {
        setZoomTransform(event.transform)
      })

    const svgSelection = select(svgElement)
    svgSelection.call(zoomBehavior)

    return (): void => {
      svgSelection.on('.zoom', null)
    }
  }, [height, width])

  if (parsedEvents.length === 0) {
    return (
      <div className="cei-viz-frame" data-testid="timeline-chart">
        <p className="cei-viz-empty">No timeline events available.</p>
      </div>
    )
  }

  const eventTimes = parsedEvents.map((event) => event.date.getTime())
  const [minTimestamp = eventTimes[0], maxTimestamp = eventTimes[eventTimes.length - 1]] =
    extent(eventTimes)

  const minDate = new Date(minTimestamp)
  const maxDate = new Date(maxTimestamp === minTimestamp ? maxTimestamp + 3_600_000 : maxTimestamp)

  const baseScale = scaleTime()
    .domain([minDate, maxDate])
    .range([padding.left, width - padding.right])
  const zoomedScale = zoomTransform.rescaleX(baseScale)
  const axisY = height - padding.bottom

  const onPointHover = (event: MouseEvent, item: ParsedTimelineEvent): void => {
    const bounds = containerRef.current?.getBoundingClientRect()

    if (!bounds) {
      return
    }

    setTooltip({
      event: item,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
  }

  const onPointMove = (event: MouseEvent, item: ParsedTimelineEvent): void => {
    onPointHover(event, item)
  }

  return (
    <div className="cei-viz-frame" data-testid="timeline-chart" ref={containerRef}>
      <svg
        height={height}
        ref={svgRef}
        viewBox={`0 0 ${width.toString()} ${height.toString()}`}
        width={width}
      >
        <line
          stroke={VIZ_THEME.grid}
          strokeWidth={2}
          x1={padding.left}
          x2={width - padding.right}
          y1={axisY}
          y2={axisY}
        />

        {parsedEvents.map((item) => {
          const pointX = zoomedScale(item.date)
          const pointY = axisY
          const color = severityColor(
            item.severity === 'critical' ||
              item.severity === 'high' ||
              item.severity === 'medium' ||
              item.severity === 'low'
              ? item.severity
              : 'low',
          )

          return (
            <g key={item.id} transform={`translate(${pointX.toString()}, ${pointY.toString()})`}>
              <circle
                className="cei-viz-timeline-dot"
                cx={0}
                cy={0}
                data-testid="timeline-event-dot"
                fill={color}
                onMouseEnter={(event): void => onPointHover(event.nativeEvent, item)}
                onMouseLeave={(): void => setTooltip(null)}
                onMouseMove={(event): void => onPointMove(event.nativeEvent, item)}
                r={6}
              />
              <text className="cei-viz-timeline-label" dy="-10" textAnchor="middle" x={0} y={0}>
                {item.label}
              </text>
              <text className="cei-viz-axis-label" dy="16" textAnchor="middle" x={0} y={0}>
                {item.date.toISOString().slice(0, 10)}
              </text>
            </g>
          )
        })}
      </svg>

      {tooltip ? (
        <div
          className="cei-viz-tooltip"
          role="status"
          style={{
            left: `${Math.max(8, tooltip.x + 12).toString()}px`,
            top: `${Math.max(8, tooltip.y - 18).toString()}px`,
          }}
        >
          <div>{tooltip.event.label}</div>
          <div>{tooltip.event.date.toISOString()}</div>
        </div>
      ) : null}
    </div>
  )
}
